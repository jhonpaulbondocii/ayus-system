"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Pencil, Trash2,
  Search, ChevronDown, X, Send,
  Inbox, MailOpen, UserRound,
  ClipboardList, Megaphone, GraduationCap, FileText,
  ArrowLeft, RefreshCw, ChevronRight, Circle,
  Menu, Filter, MessageSquare, ExternalLink,
  Calendar, Clock, User, BookOpen, Award,
  CheckCircle, AlertCircle, Upload, Eye,
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
interface CourseRef {
  id: string;
  name: string;
  code: string;
  color: string;
}
interface NotifAssignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  availableFrom?: string | null;
  availableUntil?: string | null;
  submissionType?: string | null;
  course: CourseRef | null;
  group: { id: string; name: string } | null;
  status: string;
  grade: number | null;
  maxPoints?: number | null;
  submittedAt: string | null;
  submittedBy?: string | null;
  createdAt?: string | null;
  createdBy?: { name: string | null; role: string } | null;
}
interface NotifAnnouncement {
  id: string;
  title: string;
  bodyText: string;
  author: string;
  createdAt: string;
  course: CourseRef;
  attachments: { id: string; name: string; url: string }[];
}
interface NotifQuiz {
  id: string;
  title: string;
  description: string | null;
  quizType: string;
  points: number;
  dueDate: string | null;
  course: CourseRef;
  attempted: boolean;
  score: number | null;
  submittedAt: string | null;
  createdAt?: string | null;
}
interface NotifForm {
  id: string;
  title: string;
  description: string | null;
  formType: string;
  points: number;
  dueDate: string | null;
  course: CourseRef;
  submitted: boolean;
  score: number | null;
  submittedAt: string | null;
  createdAt?: string | null;
}
interface NotifEnrollment {
  id: string;
  courseRole: string;
  section: string | null;
  createdAt: string;
  course: CourseRef & { image: string | null; status: string };
}
interface SubmissionComment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null; role: string };
  assignment: { id: string; title: string; course: CourseRef | null };
  grade?: number | null;
  submissionId: string;
}
interface NotifGrade {
  id: string;
  assignmentId: string;
  title: string;
  description: string | null;
  score: number | null;
  maxScore: number;
  gradePercent: number | null;
  letterGrade: string | null;
  gradedAt: string | null;
  gradedBy: string | null;
  feedback: string | null;
  course: CourseRef | null;
  submittedAt: string | null;
  createdAt?: string | null;
}
type InboxItemType = "message" | "assignment" | "announcement" | "quiz" | "form" | "enrollment" | "submission_comment" | "grade";
interface UnifiedInboxItem {
  id: string;
  type: InboxItemType;
  subject: string;
  preview: string;
  date: string;
  unread: boolean;
  sender?: string;
  senderImage?: string | null;
  courseColor?: string;
  courseName?: string;
  status?: string;
  data: Conversation | NotifAssignment | NotifAnnouncement | NotifQuiz | NotifForm | NotifEnrollment | SubmissionComment | NotifGrade;
}
type PickView = "root" | "courses" | "course-roles" | "course-people" | "users";
type CategoryFilter = "all" | "messages" | "assignments" | "announcements" | "quizzes" | "enrollments" | "grades";
type MailboxFilter = "inbox" | "unread" | "sent" | "submission_comments";

// ── Constants ──────────────────────────────────────────────────────────────────
const FONT = "'Geist', 'DM Sans', 'Helvetica Neue', Arial, sans-serif";
const FONT_MONO = "'Geist Mono', 'DM Mono', 'Courier New', monospace";
const C = {
  maroon: "#8B1A1A", maroonDark: "#6B1414", maroonDeep: "#4A0E0E",
  maroonLight: "#B23A3A", maroonBg: "#FEF8F8", maroonMid: "#F5E6E6",
  maroonBorder: "#E8CECE", bg: "#F8F7F7", surface: "#FFFFFF",
  surfaceAlt: "#FAFAFA", border: "#EBEBEB", borderStrong: "#D8D8D8",
  text: "#111111", textMid: "#444444", textLight: "#777777", textMuted: "#999999",
  unread: "#8B1A1A", danger: "#DC2626", success: "#059669", warning: "#D97706", info: "#0284C7",
};
const API_BASE = "/api/inbox/conversations";
const API_USERS = "/api/users";
const API_COURSES = "/api/courses";
const API_COURSE_PEOPLE = (id: string) => `/api/courses/${id}/people`;
const API_SUBMISSION_COMMENTS = "/api/inbox/submission-comments";
const API_GRADES = "/api/inbox/grades";

const MAILBOX_FILTERS: { key: MailboxFilter; label: string; Icon: React.ElementType; color: string }[] = [
  { key: "inbox", label: "Inbox", Icon: Inbox, color: C.maroon },
  { key: "unread", label: "Unread", Icon: MailOpen, color: C.maroon },
  { key: "sent", label: "Sent", Icon: Send, color: C.textMid },
  { key: "submission_comments", label: "Submission Comments", Icon: MessageSquare, color: C.textMid },
];
const CATEGORY_FILTERS: { key: CategoryFilter; label: string; Icon: React.ElementType }[] = [
  { key: "all", label: "All", Icon: Inbox },
  { key: "messages", label: "Messages", Icon: MailOpen },
  { key: "assignments", label: "Assignments", Icon: ClipboardList },
  { key: "announcements", label: "Announcements", Icon: Megaphone },
  { key: "quizzes", label: "Quizzes & Forms", Icon: FileText },
  { key: "enrollments", label: "Enrollments", Icon: GraduationCap },
  { key: "grades", label: "Grades", Icon: Award },
];

// ── Global CSS ─────────────────────────────────────────────────────────────────
// KEY FIX: .ibx-root uses flex:1 + min-height:0 instead of height:100%
// so it fills whatever space its parent gives it (works inside app shells)
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

@keyframes shimmer  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
@keyframes fadeIn   { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
@keyframes slideIn  { from{opacity:0;transform:translateX(12px)} to{opacity:1;transform:translateX(0)} }
@keyframes slideInLeft { from{opacity:0;transform:translateX(-100%)} to{opacity:1;transform:translateX(0)} }
@keyframes slideUp  { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
@keyframes spin     { to{transform:rotate(360deg)} }
@keyframes scaleIn  { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
@keyframes overlayIn { from{opacity:0} to{opacity:1} }

.ibx-root *, .ibx-root *::before, .ibx-root *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; touch-action: manipulation; }

/* Prevent iOS zoom on input focus */
input, textarea, select { font-size: 16px !important; }
@media (min-width: 600px) {
  input, textarea, select { font-size: 13px !important; }
}

/*
 * CRITICAL MOBILE FIX:
 * .ibx-root must use flex:1 + min-height:0 NOT height:100%.
 * height:100% only works if every ancestor has an explicit height.
 * flex:1 + min-height:0 works inside any flex container (app shells, route wrappers, etc.)
 */
.ibx-root {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
  font-family: ${FONT};
  background: ${C.bg};
  color: ${C.text};
  font-size: 14px;
  position: relative;
  overflow: hidden; /* prevent double scrollbars */
}

/*
 * CRITICAL MOBILE FIX:
 * .ibx-body must be position:relative so that the absolutely-positioned
 * list/thread panels on mobile have a reference frame with a real height.
 */
.ibx-body {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
  position: relative; /* required for absolute children on mobile */
}

.ibx-sidebar {
  width: 224px; flex-shrink: 0;
  background: ${C.surface};
  border-right: 1px solid ${C.border};
  display: flex; flex-direction: column;
  overflow: hidden;
  transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
  z-index: 100;
}

.ibx-list-panel {
  width: 340px; flex-shrink: 0;
  background: ${C.surface};
  border-right: 1px solid ${C.border};
  display: flex; flex-direction: column;
  overflow: hidden;
  /* NO transition here on desktop - only mobile needs slide */
}

.ibx-thread-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${C.bg};
  min-width: 0;
}

/* Scrollbars */
.ibx-scroll::-webkit-scrollbar { width: 3px; }
.ibx-scroll::-webkit-scrollbar-track { background: transparent; }
.ibx-scroll::-webkit-scrollbar-thumb { background: ${C.maroonMid}; border-radius: 2px; }

/* Row hover */
.ibx-row { transition: background 0.1s; }
.ibx-row:hover { background: ${C.maroonBg} !important; }
.ibx-row:active { background: ${C.maroonMid} !important; }

/* Buttons */
.ibx-btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 6px; border: none; cursor: pointer;
  font-family: ${FONT}; transition: all 0.12s; white-space: nowrap;
  background: none; border-radius: 6px; padding: 0;
  -webkit-tap-highlight-color: transparent; touch-action: manipulation;
}
.ibx-btn:disabled { cursor: default; opacity: 0.4; }
.ibx-icon-btn {
  width: 36px; height: 36px; border-radius: 8px;
  background: none; border: 1px solid ${C.border}; color: ${C.textLight};
}
.ibx-icon-btn:hover:not(:disabled) {
  border-color: ${C.maroon}; color: ${C.maroon}; background: ${C.maroonBg};
}
.ibx-icon-btn:active:not(:disabled) { background: ${C.maroonMid}; }

/* Shimmer skeleton */
.ibx-shimmer {
  background: linear-gradient(90deg,${C.border} 25%,${C.maroonMid} 50%,${C.border} 75%);
  background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 4px;
}

/* Recipient chip */
.ibx-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px 2px 10px; border-radius: 20px;
  font-size: 12px; font-weight: 600;
  background: ${C.maroonMid}; color: ${C.maroon};
}

/* Dropdown */
.ibx-dropdown {
  position: absolute; top: calc(100% + 4px); left: 0;
  background: ${C.surface}; border: 1px solid ${C.border};
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06);
  z-index: 9999; overflow: hidden; animation: scaleIn 0.12s ease; min-width: 200px;
}

/* Overlay */
.ibx-overlay {
  display: none; position: fixed; inset: 0;
  background: rgba(0,0,0,0.4); z-index: 150;
  animation: overlayIn 0.2s ease;
}
.ibx-overlay.visible { display: block; }

/* Bottom sheet */
.ibx-bottom-sheet {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 600;
  background: ${C.surface}; border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 32px rgba(0,0,0,0.12);
  animation: slideUp 0.22s ease; max-height: 70vh; overflow-y: auto;
}

/* Compose modal */
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

/* Role badge */
.ibx-role-badge {
  font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 20px;
  font-family: ${FONT_MONO}; letter-spacing: 0.04em; text-transform: uppercase; flex-shrink: 0;
}

/* Detail card */
.detail-card {
  background: ${C.surface}; border: 1px solid ${C.border};
  border-radius: 12px; overflow: hidden; animation: fadeIn 0.25s ease;
}
.detail-meta-row {
  display: flex; align-items: center; gap: 8px;
  padding: 11px 14px; border-bottom: 1px solid ${C.border};
  font-size: 13px; color: ${C.textMid};
}
.detail-meta-row:last-child { border-bottom: none; }
.detail-meta-icon {
  width: 28px; height: 28px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  background: ${C.maroonBg}; color: ${C.maroon}; flex-shrink: 0;
}

/* CTA button */
.cta-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 20px; border-radius: 8px;
  font-size: 13px; font-weight: 600;
  cursor: pointer; border: none; transition: all 0.15s;
  font-family: ${FONT}; white-space: nowrap;
  -webkit-tap-highlight-color: transparent; text-decoration: none;
  letter-spacing: 0.01em;
}
.cta-btn.primary { background: ${C.maroon}; color: #fff; }
.cta-btn.primary:hover { background: ${C.maroonDark}; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(139,26,26,0.3); }
.cta-btn.primary:active { transform: translateY(0); box-shadow: none; }
.cta-btn.secondary { background: ${C.maroonBg}; color: ${C.maroon}; border: 1px solid ${C.maroonBorder}; }
.cta-btn.secondary:hover { background: ${C.maroonMid}; }

/* ═══════════════════════════════════════════════════════
   MOBILE LAYOUT  < 768px
   
   IMPORTANT: list & thread panels use position:absolute + inset:0
   so they fill the FULL .ibx-body area (which is position:relative).
   This is what makes the panels visible on mobile.
═══════════════════════════════════════════════════════ */
@media (max-width: 767px) {
  /* Sidebar slides in from left as an overlay */
  .ibx-sidebar {
    position: fixed; top: 0; left: 0; bottom: 0;
    transform: translateX(-100%); z-index: 200;
    box-shadow: 4px 0 24px rgba(0,0,0,0.15);
    width: 260px !important;
  }
  .ibx-sidebar.open {
    transform: translateX(0);
    animation: slideInLeft 0.25s cubic-bezier(0.4,0,0.2,1);
  }

  /*
   * LIST PANEL: fills entire .ibx-body on mobile.
   * position:absolute + inset:0 = fills parent height exactly.
   * Without this, it has no height because the parent uses flex.
   */
  .ibx-list-panel {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    border-right: none;
    z-index: 10;
    transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
  }
  /* When thread is open, slide list off to the left */
  .ibx-list-panel.hidden-mobile {
    transform: translateX(-100%);
    pointer-events: none;
  }

  /*
   * THREAD PANEL: also fills entire .ibx-body.
   * Starts off-screen to the right, slides in when selected.
   */
  .ibx-thread-wrapper {
    position: absolute !important;
    inset: 0 !important;
    z-index: 20;
    transform: translateX(100%);
    transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
    background: ${C.bg};
  }
  .ibx-thread-wrapper.visible-mobile {
    transform: translateX(0);
  }

  /* Topbar adjustments */
  .ibx-topbar-actions { display: none !important; }
  .ibx-compose-btn-text { display: none !important; }
  .ibx-compose-btn { width: 40px !important; padding: 0 !important; border-radius: 10px !important; }
  .ibx-search-wrap { flex: 1 !important; }

  /* Compose modal goes fullscreen */
  .ibx-compose-modal {
    max-width: 100% !important; width: 100% !important;
    height: 100% !important; max-height: 100% !important; border-radius: 0 !important;
  }
  .ibx-compose-overlay { padding: 0 !important; align-items: stretch !important; }

  /* Message bubbles */
  .ibx-msg-bubble { max-width: 86% !important; }

  /* Dropdown becomes bottom sheet */
  .ibx-dropdown {
    position: fixed !important; top: auto !important; bottom: 0 !important;
    left: 0 !important; right: 0 !important; width: 100% !important;
    max-height: 70vh; border-radius: 16px 16px 0 0 !important;
    border-bottom: none !important; box-shadow: 0 -8px 40px rgba(0,0,0,0.15) !important;
    overflow: hidden;
  }

  /* Thread/detail view padding adjustments */
  .ibx-reply-area { padding: 10px 12px 20px !important; }
  .ibx-thread-header { padding: 12px 14px !important; }
  .ibx-thread-header h2 { font-size: 14px !important; }
  .ibx-messages-area { padding: 14px !important; gap: 12px !important; }
  .detail-wrap { padding: 14px !important; }
  .cta-btn { padding: 10px 16px !important; font-size: 13px !important; }
}

/* ── TABLET 768–1023px ── */
@media (min-width: 768px) and (max-width: 1023px) {
  .ibx-sidebar { width: 200px; }
  .ibx-list-panel { width: 280px !important; }
  .ibx-compose-btn-text { display: none !important; }
  .ibx-compose-btn { width: 40px !important; padding: 0 !important; }
}

/* ── DESKTOP ≥1024px: hide hamburger ── */
@media (min-width: 1024px) {
  .ibx-hamburger { display: none !important; }
}

/* Safe area for notched phones */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .ibx-reply-area { padding-bottom: calc(14px + env(safe-area-inset-bottom)) !important; }
  .ibx-compose-footer { padding-bottom: calc(12px + env(safe-area-inset-bottom)) !important; }
}
`;

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = new Date(dateStr), now = new Date();
  if (d.getFullYear() === now.getFullYear())
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
}
function initials(name?: string | null, email?: string) {
  const src = name ?? email ?? "?";
  const parts = src.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}
function typeIcon(type: InboxItemType) {
  switch (type) {
    case "assignment": return <ClipboardList size={14} />;
    case "announcement": return <Megaphone size={14} />;
    case "quiz": return <FileText size={14} />;
    case "form": return <ClipboardList size={14} />;
    case "enrollment": return <GraduationCap size={14} />;
    case "submission_comment": return <MessageSquare size={14} />;
    case "grade": return <Award size={14} />;
    default: return <MailOpen size={14} />;
  }
}
function typeLabel(type: InboxItemType) {
  switch (type) {
    case "assignment": return "Assignment";
    case "announcement": return "Announcement";
    case "quiz": return "Quiz";
    case "form": return "Form";
    case "enrollment": return "Enrollment";
    case "submission_comment": return "Submission Comment";
    case "grade": return "Grade";
    default: return "Message";
  }
}
function typeColor(type: InboxItemType): { bg: string; color: string } {
  switch (type) {
    case "assignment": return { bg: "#FEF3C7", color: "#92400E" };
    case "announcement": return { bg: "#DBEAFE", color: "#1E3A8A" };
    case "quiz": return { bg: "#EDE9FE", color: "#5B21B6" };
    case "form": return { bg: "#D1FAE5", color: "#065F46" };
    case "enrollment": return { bg: "#D1FAE5", color: "#065F46" };
    case "submission_comment": return { bg: C.maroonMid, color: C.maroon };
    case "grade": return { bg: "#D1FAE5", color: "#065F46" };
    default: return { bg: C.maroonMid, color: C.maroon };
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
function statusConfig(status: string): { bg: string; color: string; label: string; dot: string } {
  const s = status?.toUpperCase();
  const map: Record<string, { bg: string; color: string; label: string; dot: string }> = {
    PENDING:     { bg: "#FEF3C7", color: "#92400E", label: "Pending",     dot: "#F59E0B" },
    SUBMITTED:   { bg: "#D1FAE5", color: "#065F46", label: "Submitted",   dot: "#10B981" },
    GRADED:      { bg: "#DBEAFE", color: "#1E3A8A", label: "Graded",      dot: "#3B82F6" },
    LATE:        { bg: "#FEE2E2", color: "#991B1B", label: "Late",        dot: "#EF4444" },
    MISSING:     { bg: "#FEE2E2", color: "#991B1B", label: "Missing",     dot: "#EF4444" },
    DRAFT:       { bg: C.border, color: C.textMid,  label: "Draft",       dot: C.textMuted },
    PUBLISHED:   { bg: "#D1FAE5", color: "#065F46", label: "Published",   dot: "#10B981" },
    UNPUBLISHED: { bg: C.border, color: C.textMid,  label: "Unpublished", dot: C.textMuted },
  };
  return map[s] ?? { bg: C.maroonMid, color: C.maroon, label: status, dot: C.maroon };
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

// ── Shared UI ──────────────────────────────────────────────────────────────────
function Avatar({ name, image, size = 34 }: { name?: string | null; image?: string | null; size?: number }) {
  const colors = [C.maroon, "#1D4ED8", "#059669", "#7C3AED", "#DB2777", "#D97706"];
  const colorIdx = (name ?? "?").charCodeAt(0) % colors.length;
  if (image) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt={name ?? "avatar"} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${C.border}` }} />
  );
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: colors[colorIdx] + "18", border: `1.5px solid ${colors[colorIdx]}30`, color: colors[colorIdx], display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.34, fontWeight: 700, fontFamily: FONT_MONO, flexShrink: 0 }}>
      {initials(name)}
    </div>
  );
}
function RoleBadge({ role }: { role: string }) {
  const s = roleBadgeStyle(role);
  return <span className="ibx-role-badge" style={{ background: s.bg, color: s.color }}>{role}</span>;
}
function StatusBadge({ status }: { status: string }) {
  const c = statusConfig(status);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: c.bg, color: c.color, flexShrink: 0 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />{c.label}
    </span>
  );
}
function Skeleton({ w = "100%", h = 12, mb = 0 }: { w?: string | number; h?: number; mb?: number }) {
  return <div className="ibx-shimmer" style={{ width: w, height: h, marginBottom: mb }} />;
}
function ListSkeleton() {
  return (
    <div style={{ padding: "8px 0" }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ display: "flex", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0 }} className="ibx-shimmer" />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Skeleton w="45%" h={12} /><Skeleton w="36px" h={11} />
            </div>
            <Skeleton w="70%" h={12} /><Skeleton w="50%" h={11} />
          </div>
        </div>
      ))}
    </div>
  );
}
function EmptyState({ mailbox }: { mailbox: string }) {
  const map: Record<string, { title: string; sub: string; icon: string }> = {
    inbox:               { title: "Inbox is empty",            sub: "New messages will appear here",      icon: "📭" },
    unread:              { title: "All caught up!",            sub: "No unread messages right now",       icon: "✅" },
    sent:                { title: "No sent messages",          sub: "Messages you send will appear here", icon: "📤" },
    submission_comments: { title: "No submission comments",   sub: "Grader feedback will appear here",   icon: "💬" },
  };
  const { title, sub, icon } = map[mailbox] ?? map.inbox;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "60px 24px", animation: "fadeIn 0.3s ease" }}>
      <div style={{ fontSize: 44, lineHeight: 1 }}>{icon}</div>
      <p style={{ fontSize: 14, fontWeight: 600, color: C.textMid, margin: 0, textAlign: "center" }}>{title}</p>
      <p style={{ fontSize: 12, color: C.textMuted, margin: 0, textAlign: "center" }}>{sub}</p>
    </div>
  );
}

// ── Detail Shell ───────────────────────────────────────────────────────────────
function DetailShell({ onBack, typeBg, typeColor, typeLabel: tl, courseName, title, children }: {
  onBack: () => void; typeBg: string; typeColor: string; typeLabel: string;
  courseName?: string; title: string; children: React.ReactNode;
}) {
  return (
    <div className="ibx-thread-panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="ibx-thread-header" style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <button className="ibx-btn ibx-icon-btn" onClick={onBack} style={{ flexShrink: 0, marginTop: 1 }}>
            <ArrowLeft size={15} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: typeBg, color: typeColor, fontFamily: FONT_MONO, textTransform: "uppercase", letterSpacing: "0.06em" }}>{tl}</span>
              {courseName && <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500 }}>{courseName}</span>}
            </div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1.35, wordBreak: "break-word" }}>{title}</h2>
          </div>
        </div>
      </div>
      <div className="ibx-scroll detail-wrap" style={{ flex: 1, overflowY: "auto", padding: "18px", background: C.bg }}>
        <div style={{ maxWidth: 660, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
function MetaRow({ icon, label, value, accent = false }: { icon: React.ReactNode; label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="detail-meta-row" style={{ background: accent ? C.maroonBg : C.surface }}>
      <div className="detail-meta-icon" style={{ background: accent ? C.maroonMid : C.maroonBg }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: accent ? C.maroon : C.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: FONT_MONO, marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: accent ? C.maroon : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value ?? "—"}</div>
      </div>
    </div>
  );
}

// ── Person Picker ──────────────────────────────────────────────────────────────
function NavItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="ibx-btn" onClick={onClick}
      style={{ width: "100%", justifyContent: "space-between", padding: "13px 14px", border: "none", background: "none", fontSize: 14, fontWeight: 500, color: C.textMid, borderBottom: `1px solid ${C.border}`, minHeight: 50, fontFamily: FONT }}
      onMouseEnter={e => { e.currentTarget.style.background = C.maroonBg; e.currentTarget.style.color = C.maroon; }}
      onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.textMid; }}
    >
      {label}<ChevronRight size={14} style={{ color: C.textMuted }} />
    </button>
  );
}
function PersonRow({ u, onSelect }: { u: UserResult; onSelect: (u: UserResult) => void }) {
  return (
    <button className="ibx-btn" onClick={() => onSelect(u)}
      style={{ width: "100%", justifyContent: "flex-start", padding: "11px 14px", border: "none", background: "none", gap: 10, borderBottom: `1px solid ${C.border}`, minHeight: 54, fontFamily: FONT }}
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
function PersonPickerDropdown({ courseOptions, onSelectUser, onClose }: {
  courseOptions: CourseOption[]; onSelectUser: (u: UserResult) => void; onClose: () => void;
}) {
  const [view, setView] = useState<PickView>("root");
  const [query, setQuery] = useState("");
  const [activeCourse, setActiveCourse] = useState<CourseOption | null>(null);
  const [activeRole, setActiveRole] = useState<string | null>(null);
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
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(API_COURSE_PEOPLE(activeCourse.id));
        const d = await r.json();
        if (cancelled) return;
        const list = d.people ?? [];
        setAllPeople(activeRole ? list.filter((u: UserResult & { role?: string }) => (u.role ?? "").toLowerCase() === activeRole.toLowerCase()) : list);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [view, activeCourse, activeRole]);

  const filteredPeople = view === "course-people"
    ? (query.trim() ? allPeople.filter(u => (u.name ?? "").toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase())) : allPeople)
    : [];
  const filteredCourses = courseOptions.filter(o => o.name.toLowerCase().includes(query.toLowerCase()));
  const goBack = () => {
    if (view === "course-people") { setView("course-roles"); setQuery(""); setAllPeople([]); }
    else if (view === "course-roles") { setView("courses"); setQuery(""); setActiveCourse(null); }
    else { setView("root"); setQuery(""); }
  };
  const breadcrumb = view === "course-roles" ? activeCourse?.name : view === "course-people" ? (activeRole ?? "All") : null;
  const showSearch = view !== "root" && view !== "course-roles";

  return (
    <div style={{ display: "flex", flexDirection: "column", maxHeight: "70vh", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }} />
      </div>
      {view !== "root" && (
        <button className="ibx-btn" onClick={goBack} style={{ padding: "11px 14px", background: C.maroon, border: "none", color: "#fff", fontSize: 14, fontWeight: 600, gap: 6, justifyContent: "flex-start", borderBottom: `1px solid ${C.maroonDark}` }}>
          <ArrowLeft size={14} />{breadcrumb ?? "Back"}
        </button>
      )}
      {showSearch && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${C.border}`, background: C.surfaceAlt }}>
          <Search size={14} style={{ color: C.textMuted, flexShrink: 0 }} />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…"
            style={{ flex: 1, border: "none", outline: "none", fontFamily: FONT, color: C.text, background: "transparent" }} />
          {query && <button className="ibx-btn" onClick={() => setQuery("")} style={{ border: "none", background: "none", color: C.textMuted, width: 20, height: 20 }}><X size={13} /></button>}
        </div>
      )}
      <div style={{ overflowY: "auto", flex: 1 }} className="ibx-scroll">
        {view === "root" && (<>
          <NavItem label="Browse Courses" onClick={() => { setView("courses"); setQuery(""); }} />
          <NavItem label="All Users" onClick={() => { setView("users"); setQuery(""); fetchUsers(""); }} />
        </>)}
        {view === "courses" && (filteredCourses.length === 0
          ? <p style={{ fontSize: 13, color: C.textMuted, padding: 16, margin: 0 }}>No courses found.</p>
          : filteredCourses.filter(o => o.type === "course").map(o => (
            <NavItem key={o.id} label={o.name} onClick={() => { setActiveCourse(o); setView("course-roles"); setQuery(""); }} />
          )))}
        {view === "course-roles" && ["Teachers", "Staff", "Dean"].map(role => (
          <NavItem key={role} label={role} onClick={() => { setActiveRole(role); setView("course-people"); setQuery(""); setAllPeople([]); }} />
        ))}
        {view === "course-people" && (loading
          ? <div style={{ padding: 16 }}><Skeleton w="60%" h={14} mb={8} /><Skeleton w="80%" h={12} /></div>
          : filteredPeople.length === 0
            ? <p style={{ fontSize: 13, color: C.textMuted, padding: 16, margin: 0 }}>No people found.</p>
            : filteredPeople.map(u => <PersonRow key={u.id} u={u} onSelect={u2 => { onSelectUser(u2); onClose(); }} />)
        )}
        {view === "users" && (loading
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
function InboxRow({ item, selected, checked, onSelect, onCheck }: { item: UnifiedInboxItem; selected: boolean; checked: boolean; onSelect: () => void; onCheck: (id: string) => void }) {
  const isMsg = item.type === "message";
  const tc = typeColor(item.type);
  return (
    <div className="ibx-row"
      style={{ display: "flex", alignItems: "flex-start", gap: 0, padding: "0", borderBottom: `1px solid ${C.border}`, cursor: "pointer", position: "relative", minHeight: 70, background: checked ? C.maroonMid : selected ? C.maroonBg : C.surface, borderLeft: selected ? `3px solid ${C.maroon}` : "3px solid transparent" }}
    >
      <div style={{ width: 36, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 26, paddingLeft: 8 }}
        onClick={e => { e.stopPropagation(); onCheck(item.id); }}
      >
        <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${checked ? C.maroon : C.borderStrong}`, background: checked ? C.maroon : C.surface, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.1s" }}>
          {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        {!checked && item.unread && <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.maroon, display: "block", position: "absolute", left: 6, top: 20 }} />}
      </div>
      <div style={{ padding: "13px 8px 13px 4px", flexShrink: 0 }} onClick={onSelect}>
        {(isMsg || item.type === "submission_comment")
          ? <Avatar name={item.sender} image={item.senderImage} size={38} />
          : <div style={{ width: 38, height: 38, borderRadius: 10, background: tc.bg, display: "flex", alignItems: "center", justifyContent: "center", color: tc.color }}>{typeIcon(item.type)}</div>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0, padding: "13px 12px 13px 0" }} onClick={onSelect}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: item.unread ? 700 : 500, color: item.unread ? C.text : C.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {item.subject}
          </span>
          <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0, fontFamily: FONT_MONO }}>{timeAgo(item.date)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {!isMsg && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 3, background: tc.bg, color: tc.color, fontFamily: FONT_MONO, textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>
              {typeLabel(item.type)}
            </span>
          )}
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {item.sender ?? ""}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Detail Views ───────────────────────────────────────────────────────────────
function AssignmentDetail({ item, onBack }: { item: UnifiedInboxItem; onBack: () => void }) {
  const a = item.data as NotifAssignment;
  const tc = typeColor("assignment");
  const href = a.course ? `/courses/${a.course.id}/assignments/${a.id}` : `/groups/${a.group?.id}/assignments/${a.id}`;
  return (
    <DetailShell onBack={onBack} typeBg={tc.bg} typeColor={tc.color} typeLabel="Assignment" courseName={item.courseName} title={item.subject}>
      <div className="detail-card">
        {(a.createdBy?.name || a.createdBy?.role) && (
          <MetaRow icon={<User size={13} />} label="Posted By" value={
            <span>{a.createdBy?.name ?? "Unknown"} {a.createdBy?.role && <RoleBadge role={a.createdBy.role} />}</span>
          } />
        )}
        {a.course && <MetaRow icon={<BookOpen size={13} />} label="Office" value={a.course.name} />}
        {a.group && <MetaRow icon={<BookOpen size={13} />} label="Group" value={a.group.name} />}
        {a.availableFrom && <MetaRow icon={<Clock size={13} />} label="Available From" value={fmtDateTime(a.availableFrom)} />}
        {a.dueDate && <MetaRow icon={<Calendar size={13} />} label="Due Date" value={fmtDateTime(a.dueDate)} />}
        {a.availableUntil && <MetaRow icon={<Clock size={13} />} label="Available Until" value={fmtDateTime(a.availableUntil)} />}
        {a.submissionType && <MetaRow icon={<Upload size={13} />} label="Submission Type" value={a.submissionType} />}
        {a.submittedAt && <MetaRow icon={<CheckCircle size={13} />} label="Submitted At" value={fmtDateTime(a.submittedAt)} accent />}
        {a.grade !== null && a.grade !== undefined && <MetaRow icon={<Award size={13} />} label="Grade" value={a.maxPoints ? `${a.grade} / ${a.maxPoints} pts` : `${a.grade}`} accent />}
      </div>
      {a.description && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px", fontFamily: FONT_MONO }}>Instructions</p>
          <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.75, whiteSpace: "pre-wrap", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>{a.description}</div>
        </div>
      )}
      <div style={{ paddingTop: 4 }}>
        <a href={href} className="cta-btn primary"><Eye size={14} />Go to Assignment<ExternalLink size={12} style={{ opacity: 0.7 }} /></a>
      </div>
    </DetailShell>
  );
}
function AnnouncementDetail({ item, onBack }: { item: UnifiedInboxItem; onBack: () => void }) {
  const a = item.data as NotifAnnouncement;
  const tc = typeColor("announcement");
  const href = `/courses/${a.course?.id}/announcements/${a.id}`;
  return (
    <DetailShell onBack={onBack} typeBg={tc.bg} typeColor={tc.color} typeLabel="Announcement" courseName={item.courseName} title={item.subject}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>
        <Avatar name={a.author} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{a.author}</p>
          <p style={{ fontSize: 12, color: C.textMuted, margin: "2px 0 0" }}>Posted {fmtDate(a.createdAt)}</p>
        </div>
        {a.course && <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: (a.course.color || C.maroon) + "18", color: a.course.color || C.maroon, flexShrink: 0 }}>{a.course.name}</span>}
      </div>
      <div style={{ fontSize: 14, color: C.text, lineHeight: 1.8, whiteSpace: "pre-wrap", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px" }}>{a.bodyText}</div>
      {a.attachments?.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px", fontFamily: FONT_MONO }}>Attachments ({a.attachments.length})</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {a.attachments.map(att => (
              <a key={att.id} href={att.url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 500, color: C.textMid, textDecoration: "none" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.maroon; e.currentTarget.style.color = C.maroon; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMid; }}
              >📎 {att.name}</a>
            ))}
          </div>
        </div>
      )}
      <div style={{ paddingTop: 4 }}>
        <a href={href} className="cta-btn primary"><Megaphone size={14} />View Announcement<ExternalLink size={12} style={{ opacity: 0.7 }} /></a>
      </div>
    </DetailShell>
  );
}
function QuizFormDetail({ item, onBack }: { item: UnifiedInboxItem; onBack: () => void }) {
  const isQuiz = item.type === "quiz";
  const data = item.data as NotifQuiz | NotifForm;
  const quiz = isQuiz ? (data as NotifQuiz) : null;
  const form = !isQuiz ? (data as NotifForm) : null;
  const done = quiz ? quiz.attempted : form!.submitted;
  const score = quiz ? quiz.score : form!.score;
  const href = data.course ? `/courses/${data.course.id}/${isQuiz ? "quizzes" : "forms"}/${data.id}` : "#";
  const tc = typeColor(item.type);
  return (
    <DetailShell onBack={onBack} typeBg={tc.bg} typeColor={tc.color} typeLabel={isQuiz ? "Quiz" : "Form"} courseName={item.courseName} title={item.subject}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <StatusBadge status={done ? "SUBMITTED" : "PENDING"} />
        {score !== null && score !== undefined && (
          <span style={{ fontSize: 13, fontWeight: 700, color: C.maroon, background: C.maroonMid, padding: "4px 12px", borderRadius: 20, border: `1px solid ${C.maroonBorder}` }}>
            Score: {score}{quiz ? ` / ${quiz.points}` : ""}
          </span>
        )}
      </div>
      <div className="detail-card">
        {data.dueDate && <MetaRow icon={<Calendar size={13} />} label="Due Date" value={fmtDateTime(data.dueDate)} />}
        {isQuiz && <MetaRow icon={<Award size={13} />} label="Points" value={`${(data as NotifQuiz).points} pts`} />}
        <MetaRow icon={done ? <CheckCircle size={13} /> : <AlertCircle size={13} />} label="Status" value={done ? (isQuiz ? "Attempted" : "Submitted") : "Not yet taken"} accent={done} />
        {score !== null && score !== undefined && <MetaRow icon={<Award size={13} />} label="Your Score" value={`${score}`} accent />}
        {quiz?.submittedAt && <MetaRow icon={<Clock size={13} />} label="Submitted At" value={fmtDateTime(quiz.submittedAt)} />}
        {form?.submittedAt && <MetaRow icon={<Clock size={13} />} label="Submitted At" value={fmtDateTime(form.submittedAt)} />}
      </div>
      {data.description && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px", fontFamily: FONT_MONO }}>Instructions</p>
          <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.75, whiteSpace: "pre-wrap", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>{data.description}</div>
        </div>
      )}
      <div style={{ paddingTop: 4 }}>
        <a href={href} className="cta-btn primary"><FileText size={14} />{done ? `View ${isQuiz ? "Quiz" : "Form"} Results` : `Take ${isQuiz ? "Quiz" : "Form"}`}<ExternalLink size={12} style={{ opacity: 0.7 }} /></a>
      </div>
    </DetailShell>
  );
}
function EnrollmentDetail({ item, onBack }: { item: UnifiedInboxItem; onBack: () => void }) {
  const e = item.data as NotifEnrollment;
  const tc = typeColor("enrollment");
  return (
    <DetailShell onBack={onBack} typeBg={tc.bg} typeColor={tc.color} typeLabel="Enrollment" title={item.subject}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ height: 5, background: e.course.color ?? C.maroon }} />
        <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ width: 50, height: 50, borderRadius: 12, background: (e.course.color ?? C.maroon) + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <GraduationCap size={22} color={e.course.color ?? C.maroon} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.course.name}</p>
            <p style={{ fontSize: 12, color: C.textMuted, margin: "3px 0 0", fontFamily: FONT_MONO }}>{e.course.code}</p>
          </div>
          <StatusBadge status={e.course.status === "PUBLISHED" ? "PUBLISHED" : "UNPUBLISHED"} />
        </div>
      </div>
      <div className="detail-card">
        <MetaRow icon={<User size={13} />} label="Your Role" value={e.courseRole} accent />
        <MetaRow icon={<BookOpen size={13} />} label="Course Code" value={e.course.code} />
        <MetaRow icon={<Circle size={13} />} label="Status" value={e.course.status === "PUBLISHED" ? "Published" : "Unpublished"} />
        {e.section && <MetaRow icon={<ClipboardList size={13} />} label="Section" value={e.section} />}
        <MetaRow icon={<Clock size={13} />} label="Enrolled" value={fmtDate(e.createdAt)} />
      </div>
      <div style={{ paddingTop: 4 }}>
        <a href={`/courses/${e.course.id}`} className="cta-btn primary"><GraduationCap size={14} />Go to Course<ExternalLink size={12} style={{ opacity: 0.7 }} /></a>
      </div>
    </DetailShell>
  );
}
function SubmissionCommentDetail({ item, onBack }: { item: UnifiedInboxItem; onBack: () => void }) {
  const comment = item.data as SubmissionComment;
  const href = comment.assignment.course ? `/courses/${comment.assignment.course.id}/assignments/${comment.assignment.id}/submissions/${comment.submissionId}` : "#";
  const tc = typeColor("submission_comment");
  return (
    <DetailShell onBack={onBack} typeBg={tc.bg} typeColor={tc.color} typeLabel="Submission Comment" courseName={comment.assignment.course?.name} title={comment.assignment.title}>
      {comment.grade !== null && comment.grade !== undefined && (
        <div className="detail-card"><MetaRow icon={<Award size={13} />} label="Grade" value={`${comment.grade}`} accent /></div>
      )}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Avatar name={comment.author.name} image={comment.author.image} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{comment.author.name ?? "Unknown"}</span>
            <RoleBadge role={comment.author.role} />
            <span style={{ fontSize: 11, color: C.textMuted, fontFamily: FONT_MONO }}>{timeAgo(comment.createdAt)}</span>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "0 12px 12px 12px", padding: "13px 15px", fontSize: 14, lineHeight: 1.7, color: C.text, whiteSpace: "pre-wrap", wordBreak: "break-word", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            {comment.body}
          </div>
        </div>
      </div>
      <div style={{ paddingTop: 4 }}>
        <a href={href} className="cta-btn primary"><ClipboardList size={14} />View Submission<ExternalLink size={12} style={{ opacity: 0.7 }} /></a>
      </div>
    </DetailShell>
  );
}
function GradeDetail({ item, onBack }: { item: UnifiedInboxItem; onBack: () => void }) {
  const g = item.data as NotifGrade;
  const pct = g.gradePercent ?? (g.score !== null && g.maxScore > 0 ? Math.round((g.score! / g.maxScore) * 100) : null);
  const gradeColor = pct === null ? C.textMid : pct >= 90 ? "#059669" : pct >= 75 ? "#0284C7" : pct >= 60 ? "#D97706" : C.danger;
  const tc = typeColor("grade");
  return (
    <DetailShell onBack={onBack} typeBg={tc.bg} typeColor={tc.color} typeLabel="Grade" courseName={g.course?.name} title={g.title}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ width: 84, height: 84, borderRadius: "50%", border: `3px solid ${gradeColor}`, background: gradeColor + "10", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {g.letterGrade
            ? <span style={{ fontSize: 28, fontWeight: 800, color: gradeColor, fontFamily: FONT_MONO, lineHeight: 1 }}>{g.letterGrade}</span>
            : pct !== null
              ? <span style={{ fontSize: 22, fontWeight: 800, color: gradeColor, fontFamily: FONT_MONO, lineHeight: 1 }}>{pct}%</span>
              : <span style={{ fontSize: 12, fontWeight: 600, color: C.textMuted }}>N/A</span>
          }
          {pct !== null && g.letterGrade && <span style={{ fontSize: 10, color: gradeColor, fontFamily: FONT_MONO, fontWeight: 700, marginTop: 1 }}>{pct}%</span>}
        </div>
        <div>
          {g.score !== null && (
            <p style={{ fontSize: 28, fontWeight: 800, color: C.text, margin: 0, fontFamily: FONT_MONO }}>
              {g.score}<span style={{ fontSize: 16, fontWeight: 500, color: C.textMuted }}> / {g.maxScore}</span>
            </p>
          )}
          <p style={{ fontSize: 12, color: C.textMuted, margin: "5px 0 0", lineHeight: 1.5 }}>
            Graded by <strong style={{ color: C.textMid }}>{g.gradedBy ?? "Instructor"}</strong>
            {g.gradedAt && <><br />{fmtDate(g.gradedAt)}</>}
          </p>
        </div>
      </div>
      <div className="detail-card">
        {g.submittedAt && <MetaRow icon={<Upload size={13} />} label="Submitted" value={fmtDateTime(g.submittedAt)} />}
        {g.gradedAt && <MetaRow icon={<Clock size={13} />} label="Graded At" value={fmtDateTime(g.gradedAt)} />}
        {g.course && <MetaRow icon={<BookOpen size={13} />} label="Course" value={g.course.name} />}
      </div>
      {g.feedback && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px", fontFamily: FONT_MONO }}>Instructor Feedback</p>
          <div style={{ fontSize: 14, color: C.text, lineHeight: 1.8, whiteSpace: "pre-wrap", background: C.surface, borderRadius: "0 10px 10px 0", border: `1px solid ${C.maroonBorder}`, borderLeft: `4px solid ${C.maroon}`, padding: "14px 18px" }}>
            {g.feedback}
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
        <a href={g.course ? `/courses/${g.course.id}/grades` : "/grades"} className="cta-btn primary"><Award size={14} />View Grades<ExternalLink size={12} style={{ opacity: 0.7 }} /></a>
        <a href={g.course ? `/courses/${g.course.id}/assignments/${g.assignmentId}` : "#"} className="cta-btn secondary"><ClipboardList size={13} />View Assignment</a>
      </div>
    </DetailShell>
  );
}

// ── Message Thread ─────────────────────────────────────────────────────────────
function MessageThread({ item, currentUserId, onBack, onArchive }: {
  item: UnifiedInboxItem; currentUserId: string; onBack: () => void; onArchive: (id: string) => void;
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
      const res = await fetch(`${API_BASE}/${item.id}`);
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
      const res = await fetch(`${API_BASE}/${item.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: reply.trim() }) });
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
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `2px solid ${C.maroonMid}`, borderTopColor: C.maroon, animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>Loading…</p>
      </div>
    </div>
  );
  if (error || !convo) return (
    <div className="ibx-thread-panel" style={{ alignItems: "center", justifyContent: "center", gap: 12 }}>
      <p style={{ color: C.danger, fontSize: 13 }}>{error ?? "Conversation not found."}</p>
      <button className="ibx-btn" onClick={onBack} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 16px", fontSize: 13, background: "none", color: C.textMid, gap: 6 }}><ArrowLeft size={13} /> Back</button>
    </div>
  );

  const others = convo.participants.filter(p => p.user.id !== currentUserId);
  return (
    <div className="ibx-thread-panel">
      <div className="ibx-thread-header" style={{ padding: "13px 16px", borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <button className="ibx-btn ibx-icon-btn" onClick={onBack} style={{ flexShrink: 0, marginTop: 1 }}><ArrowLeft size={15} /></button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: "0 0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{convo.subject}</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {others.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 5, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 20, padding: "3px 10px 3px 5px" }}>
                  <Avatar name={p.user.name} image={p.user.image} size={18} />
                  <span style={{ fontSize: 12, color: C.textMid, fontWeight: 500 }}>{p.user.name ?? "Unknown"}</span>
                  <RoleBadge role={p.user.role} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button className="ibx-btn ibx-icon-btn" title="Delete" onClick={async () => { await fetch(`${API_BASE}/${item.id}`, { method: "DELETE" }); onArchive(item.id); onBack(); }} style={{ color: C.danger, borderColor: C.danger + "40" }}><Trash2 size={14} /></button>
          </div>
        </div>
      </div>
      <div className="ibx-scroll ibx-messages-area" style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 14, background: C.bg }}>
        {convo.messages.map(msg => {
          const isMine = msg.sender.id === currentUserId;
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: isMine ? "row-reverse" : "row", gap: 8, alignItems: "flex-end", animation: "fadeIn 0.2s ease" }}>
              <Avatar name={msg.sender.name} image={msg.sender.image} size={26} />
              <div className="ibx-msg-bubble" style={{ maxWidth: "70%", display: "flex", flexDirection: "column", gap: 4, alignItems: isMine ? "flex-end" : "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {!isMine && <span style={{ fontSize: 12, fontWeight: 600, color: C.textMid }}>{msg.sender.name ?? "Unknown"}</span>}
                  {!isMine && <RoleBadge role={msg.sender.role} />}
                  <span style={{ fontSize: 10, color: C.textMuted, fontFamily: FONT_MONO }}>{timeAgo(msg.createdAt)}</span>
                </div>
                <div style={{ background: isMine ? C.maroon : C.surface, color: isMine ? "#fff" : C.text, borderRadius: isMine ? "12px 12px 3px 12px" : "12px 12px 12px 3px", padding: "10px 14px", fontSize: 14, lineHeight: 1.65, border: isMine ? "none" : `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {msg.body}
                </div>
                {msg.attachments.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {msg.attachments.map(a => (
                      <a key={a.id} href={a.url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 11, color: C.textMid, textDecoration: "none", fontFamily: FONT_MONO }}>
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
      <div className="ibx-reply-area" style={{ padding: "12px 14px 14px", borderTop: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
        {error && <p style={{ fontSize: 12, color: C.danger, margin: "0 0 8px" }}>{error}</p>}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", background: C.surfaceAlt, transition: "border-color 0.15s" }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = C.maroon)}
          onBlurCapture={e => (e.currentTarget.style.borderColor = C.border)}
        >
          <textarea value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply(); }}
            placeholder="Write a reply…  ⌘↵ to send" rows={3}
            style={{ width: "100%", border: "none", background: "transparent", padding: "11px 13px 7px", fontFamily: FONT, resize: "none", outline: "none", lineHeight: 1.6, color: C.text, display: "block" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "5px 10px 9px" }}>
            <button className="ibx-btn" onClick={sendReply} disabled={sending || !reply.trim()}
              style={{ padding: "8px 18px", borderRadius: 7, fontSize: 13, fontWeight: 600, color: "#fff", background: sending || !reply.trim() ? C.borderStrong : C.maroon, border: "none", gap: 6 }}
              onMouseEnter={e => { if (!sending && reply.trim()) e.currentTarget.style.background = C.maroonDark; }}
              onMouseLeave={e => { if (!sending && reply.trim()) e.currentTarget.style.background = C.maroon; }}
            ><Send size={13} />{sending ? "Sending…" : "Send Reply"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Thread Router ──────────────────────────────────────────────────────────────
function ThreadViewer({ item, currentUserId, onBack, onArchive }: {
  item: UnifiedInboxItem; currentUserId: string; onBack: () => void; onArchive: (id: string) => void;
}) {
  if (item.type === "assignment")         return <AssignmentDetail item={item} onBack={onBack} />;
  if (item.type === "announcement")       return <AnnouncementDetail item={item} onBack={onBack} />;
  if (item.type === "quiz" || item.type === "form") return <QuizFormDetail item={item} onBack={onBack} />;
  if (item.type === "enrollment")         return <EnrollmentDetail item={item} onBack={onBack} />;
  if (item.type === "submission_comment") return <SubmissionCommentDetail item={item} onBack={onBack} />;
  if (item.type === "grade")              return <GradeDetail item={item} onBack={onBack} />;
  return <MessageThread item={item} currentUserId={currentUserId} onBack={onBack} onArchive={onArchive} />;
}

// ── Compose Modal ──────────────────────────────────────────────────────────────
function ComposeModal({ initialRecipient, courseOptions, onClose, onSent }: {
  initialRecipient?: UserResult; courseOptions: CourseOption[]; onClose: () => void; onSent: () => void;
}) {
  const [selectedCourse, setSelectedCourse] = useState<CourseOption | null>(null);
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
      const res = await fetch(API_BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject: subject.trim() || "(no subject)", body: body.trim(), recipientIds: recipients.map(r => r.id), courseId: selectedCourse?.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      onSent(); onClose();
    } catch (e) { setError((e as Error).message); setSending(false); }
  };
  const inputStyle: React.CSSProperties = { width: "100%", border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontFamily: FONT, outline: "none", color: C.text, background: C.surfaceAlt, transition: "border-color .15s", fontSize: 14 };

  return (
    <div className="ibx-compose-overlay">
      <div className="ibx-compose-modal">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: C.maroon, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <Pencil size={14} color="rgba(255,255,255,0.8)" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>New Message</span>
          </div>
          <button className="ibx-btn" onClick={onClose} style={{ border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", width: 30, height: 30, borderRadius: 7, fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 13 }} className="ibx-scroll">
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>To <span style={{ color: C.maroon }}>*</span></label>
            <div ref={pickerRef} style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, border: `1px solid ${pickerOpen ? C.maroon : C.border}`, borderRadius: 8, padding: "7px 10px", minHeight: 42, background: C.surfaceAlt, cursor: "text", transition: "border-color 0.15s" }} onClick={() => setPickerOpen(true)}>
                {recipients.map(r => (
                  <span key={r.id} className="ibx-chip">{r.name ?? r.email}
                    <button className="ibx-btn" onClick={e => { e.stopPropagation(); removeRecipient(r.id); }} style={{ border: "none", background: "none", color: C.maroon, padding: 0, width: 16, height: 16, fontSize: 16 }}>×</button>
                  </span>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 100 }}>
                  <Search size={13} style={{ color: C.textMuted }} />
                  <span style={{ fontSize: 13, color: C.textMuted }}>{recipients.length === 0 ? "Search recipients…" : "Add more…"}</span>
                </div>
                <button className="ibx-btn" onClick={e => { e.stopPropagation(); setPickerOpen(v => !v); }} style={{ border: `1px solid ${pickerOpen ? C.maroon : C.border}`, borderRadius: 6, background: pickerOpen ? C.maroonBg : "none", color: pickerOpen ? C.maroon : C.textLight, width: 28, height: 28 }}><UserRound size={13} /></button>
              </div>
              {pickerOpen && (
                <div className="ibx-dropdown" style={{ width: "100%", top: "calc(100% + 5px)" }}>
                  <PersonPickerDropdown courseOptions={courseOptions} onSelectUser={addRecipient} onClose={() => setPickerOpen(false)} />
                </div>
              )}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Course (optional)</label>
            <select value={selectedCourse?.id ?? ""} onChange={e => setSelectedCourse(courseOptions.find(o => o.id === e.target.value) ?? null)} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
              <option value="">No course</option>
              {courseOptions.filter(o => o.type === "course").map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Message subject…" style={inputStyle} onFocus={e => (e.currentTarget.style.borderColor = C.maroon)} onBlur={e => (e.currentTarget.style.borderColor = C.border)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>Message <span style={{ color: C.maroon }}>*</span></label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} placeholder="Write your message here…" style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }} onFocus={e => (e.currentTarget.style.borderColor = C.maroon)} onBlur={e => (e.currentTarget.style.borderColor = C.border)} />
          </div>
          {attachments.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {attachments.map((f, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: C.border, borderRadius: 6, padding: "4px 10px", fontSize: 12, color: C.textMid, fontFamily: FONT_MONO }}>
                  📎 {f.name}
                  <button className="ibx-btn" onClick={() => setAttachments(p => p.filter((_, j) => j !== i))} style={{ border: "none", background: "none", color: C.textMuted, padding: 0, fontSize: 16, width: 16, height: 16 }}>×</button>
                </span>
              ))}
            </div>
          )}
          {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.danger }}>{error}</div>}
        </div>
        <div className="ibx-compose-footer" style={{ display: "flex", alignItems: "center", padding: "11px 18px", borderTop: `1px solid ${C.border}`, background: C.surfaceAlt, gap: 8, flexShrink: 0 }}>
          <button className="ibx-btn ibx-icon-btn" title="Attach" onClick={() => fileRef.current?.click()} style={{ width: 36, height: 36 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
          </button>
          <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={e => { if (e.target.files) setAttachments(p => [...p, ...Array.from(e.target.files!)]); }} />
          <span style={{ flex: 1, fontSize: 11, color: C.textMuted, fontFamily: FONT_MONO }}>{recipients.length} recipient{recipients.length !== 1 ? "s" : ""}</span>
          <button className="ibx-btn" onClick={onClose} style={{ padding: "8px 14px", borderRadius: 7, fontSize: 13, fontWeight: 500, color: C.textMid, border: `1px solid ${C.border}`, background: "none" }} onMouseEnter={e => { e.currentTarget.style.borderColor = C.maroon; e.currentTarget.style.color = C.maroon; }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMid; }}>Cancel</button>
          <button className="ibx-btn" onClick={handleSend} disabled={sending || recipients.length === 0 || !body.trim()}
            style={{ padding: "8px 18px", borderRadius: 7, fontSize: 13, fontWeight: 700, color: "#fff", background: sending || recipients.length === 0 || !body.trim() ? C.borderStrong : C.maroon, border: "none", gap: 6 }}
            onMouseEnter={e => { if (!sending && recipients.length > 0 && body.trim()) e.currentTarget.style.background = C.maroonDark; }}
            onMouseLeave={e => { if (!sending && recipients.length > 0 && body.trim()) e.currentTarget.style.background = C.maroon; }}
          ><Send size={13} />{sending ? "Sending…" : "Send"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar Content ────────────────────────────────────────────────────────────
function SidebarContent({ mailbox, category, onMailbox, onCategory, unreadCount, courses, selectedCtx, onSelectCtx, onClose }: {
  mailbox: MailboxFilter; category: CategoryFilter;
  onMailbox: (v: MailboxFilter) => void; onCategory: (v: CategoryFilter) => void;
  unreadCount: number; courses: CourseOption[];
  selectedCtx: CourseOption | null; onSelectCtx: (o: CourseOption | null) => void;
  onClose?: () => void;
}) {
  const [coursesOpen, setCoursesOpen] = useState(true);
  const go = (fn: () => void) => { fn(); onClose?.(); };

  return (
    <>
      <div style={{ padding: "14px 14px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: C.maroon, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Inbox size={13} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: C.text }}>Inbox</p>
            <p style={{ fontSize: 10, margin: 0, color: C.textMuted, fontFamily: FONT_MONO }}>Messaging Center</p>
          </div>
        </div>
        {onClose && (
          <button className="ibx-btn" onClick={onClose} style={{ border: "none", background: "none", color: C.textLight, width: 26, height: 26, borderRadius: 6 }}><X size={14} /></button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px 8px" }} className="ibx-scroll">
        <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", padding: "0 8px 5px", margin: 0 }}>Mailboxes</p>
        {MAILBOX_FILTERS.map(({ key, label, Icon: FIcon }) => {
          const active = mailbox === key;
          return (
            <button key={key} className="ibx-btn" onClick={() => go(() => onMailbox(key))}
              style={{ width: "100%", justifyContent: "flex-start", padding: "8px 10px", borderRadius: 7, gap: 8, fontSize: 13, fontWeight: active ? 600 : 400, background: active ? C.maroonBg : "none", color: active ? C.maroon : C.textMid, border: "none", marginBottom: 1, fontFamily: FONT }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = C.maroonBg; e.currentTarget.style.color = C.maroon; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.textMid; } }}
            >
              <div style={{ width: 26, height: 26, borderRadius: 6, background: active ? C.maroon + "15" : C.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FIcon size={13} color={active ? C.maroon : C.textMuted} />
              </div>
              <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
              {unreadCount > 0 && <span style={{ background: C.maroon, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 6px", fontFamily: FONT_MONO, minWidth: 18, textAlign: "center" }}>{unreadCount}</span>}
            </button>
          );
        })}

        <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", padding: "12px 8px 5px", margin: 0 }}>Categories</p>
        {CATEGORY_FILTERS.map(({ key, label, Icon }) => {
          const active = category === key;
          return (
            <button key={key} className="ibx-btn" onClick={() => go(() => onCategory(key))}
              style={{ width: "100%", justifyContent: "flex-start", padding: "8px 10px", borderRadius: 7, gap: 8, fontSize: 13, fontWeight: active ? 600 : 400, background: active ? C.maroonBg : "none", color: active ? C.maroon : C.textMid, border: "none", marginBottom: 1, fontFamily: FONT }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = C.maroonBg; e.currentTarget.style.color = C.maroon; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.textMid; } }}
            >
              <Icon size={13} style={{ flexShrink: 0 }} /><span>{label}</span>
            </button>
          );
        })}

        <div style={{ marginTop: 12 }}>
          <button className="ibx-btn" onClick={() => setCoursesOpen(v => !v)}
            style={{ width: "100%", justifyContent: "space-between", padding: "0 8px 5px", border: "none", background: "none", color: C.textMuted, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: FONT }}
          >
            Courses<ChevronDown size={10} style={{ transform: coursesOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
          </button>
          {coursesOpen && (
            <div style={{ animation: "fadeIn 0.15s ease" }}>
              <button className="ibx-btn" onClick={() => go(() => onSelectCtx(null))}
                style={{ width: "100%", justifyContent: "flex-start", padding: "7px 10px", borderRadius: 7, fontSize: 12, border: "none", fontWeight: !selectedCtx ? 600 : 400, background: !selectedCtx ? C.maroonBg : "none", color: !selectedCtx ? C.maroon : C.textMid, marginBottom: 1, fontFamily: FONT }}>
                All Courses
              </button>
              {courses.filter(o => o.type === "course").map(o => (
                <button key={o.id} className="ibx-btn" onClick={() => go(() => onSelectCtx(o))}
                  style={{ width: "100%", justifyContent: "flex-start", padding: "7px 10px", borderRadius: 7, fontSize: 12, border: "none", fontWeight: selectedCtx?.id === o.id ? 600 : 400, background: selectedCtx?.id === o.id ? C.maroonBg : "none", color: selectedCtx?.id === o.id ? C.maroon : C.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 1, fontFamily: FONT }}>
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

// ── Mobile Filter Sheet ────────────────────────────────────────────────────────
function MobileFilterSheet({ category, mailbox, onCategory, onMailbox, onClose, unreadCount }: {
  category: CategoryFilter; mailbox: MailboxFilter;
  onCategory: (v: CategoryFilter) => void; onMailbox: (v: MailboxFilter) => void;
  onClose: () => void; unreadCount: number;
}) {
  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 599 }} onClick={onClose} />
      <div className="ibx-bottom-sheet">
        <div style={{ padding: "12px 18px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Filter</span>
          <button className="ibx-btn ibx-icon-btn" onClick={onClose}><X size={14} /></button>
        </div>
        <div style={{ padding: "14px 18px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Mailbox</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {MAILBOX_FILTERS.map(({ key, label }) => (
              <button key={key} className="ibx-btn" onClick={() => { onMailbox(key); onClose(); }}
                style={{ padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, border: `1.5px solid ${mailbox === key ? C.maroon : C.border}`, background: mailbox === key ? C.maroonMid : C.surface, color: mailbox === key ? C.maroon : C.textMid }}>
                {label}
                {key === "unread" && unreadCount > 0 && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: C.maroon, color: "#fff", borderRadius: 10, padding: "1px 6px" }}>{unreadCount}</span>}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Categories</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingBottom: 20 }}>
            {CATEGORY_FILTERS.map(({ key, label, Icon }) => (
              <button key={key} className="ibx-btn" onClick={() => { onCategory(key); onClose(); }}
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
  const isMobile = windowWidth < 768;

  const [currentUserId, setCurrentUserId] = useState(propUserId ?? "");
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCtx, setSelectedCtx] = useState<CourseOption | null>(null);
  const [mailbox, setMailbox] = useState<MailboxFilter>("inbox");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [allItems, setAllItems] = useState<UnifiedInboxItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [composeFor, setComposeFor] = useState<UserResult | undefined>();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUserId) return;
    fetch("/api/auth/session").then(r => r.json()).then(d => { if (d?.user?.id) setCurrentUserId(d.user.id); }).catch(() => { });
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

  const fetchAll = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const params = new URLSearchParams({ mailbox });
      if (selectedCtx?.type === "course") params.set("courseId", selectedCtx.id);

      if (mailbox === "sent") {
        const res = await fetch(`${API_BASE}?${params}`).catch(() => null);
        const data = res ? await res.json() : {};
        const convos: Conversation[] = data.conversations ?? [];
        const items: UnifiedInboxItem[] = convos.map(c => ({ id: c.id, type: "message" as InboxItemType, subject: c.subject, preview: c.preview, date: c.date, unread: c.unread, sender: c.participants[0]?.name ?? "Unknown", senderImage: c.participants[0]?.image, data: c }));
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAllItems(items); return;
      }

      if (mailbox === "submission_comments") {
        const scRes = await fetch(API_SUBMISSION_COMMENTS).catch(() => null);
        const scData = scRes ? await scRes.json() : {};
        const comments: SubmissionComment[] = scData.comments ?? [];
        const items: UnifiedInboxItem[] = comments.map(sc => ({ id: sc.id, type: "submission_comment" as InboxItemType, subject: sc.assignment.title, preview: sc.body, date: sc.createdAt, unread: true, sender: sc.author.name ?? "Unknown", senderImage: sc.author.image, courseColor: sc.assignment.course?.color, courseName: sc.assignment.course?.name, data: sc }));
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAllItems(items); return;
      }

      const [convRes, asgnRes, annRes, qzRes, enrRes, gradeRes] = await Promise.allSettled([
        fetch(`${API_BASE}?${params}`).then(r => r.json()),
        fetch("/api/assignments").then(r => r.json()),
        fetch("/api/announcements").then(r => r.json()),
        fetch("/api/quizzes").then(r => r.json()),
        fetch("/api/inbox/enrollments").then(r => r.json()),
        fetch(API_GRADES).then(r => r.json()),
      ]);

      const items: UnifiedInboxItem[] = [];

      if (convRes.status === "fulfilled") {
        for (const c of (convRes.value.conversations ?? []) as Conversation[]) {
          items.push({ id: c.id, type: "message", subject: c.subject, preview: c.preview, date: c.date, unread: c.unread, sender: c.participants[0]?.name ?? "Unknown", senderImage: c.participants[0]?.image, data: c });
        }
      }
      if (mailbox === "inbox" || mailbox === "unread") {
        if (asgnRes.status === "fulfilled") {
  console.log("ASSIGNMENT SAMPLE:", JSON.stringify(asgnRes.value.assignments?.[0], null, 2));
  for (const a of (asgnRes.value.assignments ?? []) as NotifAssignment[]) {
            items.push({ id: a.id, type: "assignment", subject: a.title, preview: a.dueDate ? `Due ${fmtDateTime(a.dueDate)}` : (a.description ?? ""), date: a.createdAt ?? a.dueDate ?? a.submittedAt ?? new Date().toISOString(), unread: a.status === "PENDING", sender: a.createdBy ? `${a.createdBy.name ?? "Unknown"} · ${a.createdBy.role}` : a.course?.name ?? a.group?.name ?? "Assignment", courseColor: a.course?.color, courseName: a.course?.name, status: a.status, data: a });
          }
        }
        if (annRes.status === "fulfilled") {
          for (const a of (annRes.value.announcements ?? []) as NotifAnnouncement[]) {
            items.push({ id: a.id, type: "announcement", subject: a.title, preview: a.bodyText, date: a.createdAt, unread: true, sender: a.author, courseColor: a.course?.color, courseName: a.course?.name, data: a });
          }
        }
        if (qzRes.status === "fulfilled") {
          for (const q of (qzRes.value.quizzes ?? []) as NotifQuiz[]) {
            items.push({ id: q.id, type: "quiz", subject: q.title, preview: q.dueDate ? `Due ${fmtDateTime(q.dueDate)}` : (q.description ?? ""), date: q.dueDate ?? new Date().toISOString(), unread: !q.attempted, sender: q.course?.name ?? "Quiz", courseColor: q.course?.color, courseName: q.course?.name, data: q });
          }
          for (const f of (qzRes.value.forms ?? []) as NotifForm[]) {
            items.push({ id: f.id, type: "form", subject: f.title, preview: f.dueDate ? `Due ${fmtDateTime(f.dueDate)}` : (f.description ?? ""), date: f.dueDate ?? new Date().toISOString(), unread: !f.submitted, sender: f.course?.name ?? "Form", courseColor: f.course?.color, courseName: f.course?.name, data: f });
          }
        }
        if (enrRes.status === "fulfilled") {
          for (const e of (enrRes.value.enrollments ?? []) as NotifEnrollment[]) {
            items.push({ id: e.id, type: "enrollment", subject: e.course.name, preview: `${e.courseRole} · ${e.course.code}${e.section ? ` · Section ${e.section}` : ""}`, date: e.createdAt, unread: false, sender: e.course.name, courseColor: e.course.color, courseName: e.course.name, data: e });
          }
        }
        if (gradeRes.status === "fulfilled") {
          for (const g of (gradeRes.value.grades ?? []) as NotifGrade[]) {
            const pct = g.gradePercent ?? (g.score !== null && g.maxScore > 0 ? Math.round((g.score! / g.maxScore) * 100) : null);
            items.push({ id: g.id, type: "grade", subject: g.title, preview: g.score !== null ? `Score: ${g.score}/${g.maxScore}${g.letterGrade ? ` · ${g.letterGrade}` : ""}${pct !== null ? ` · ${pct}%` : ""}` : "Grade released", date: g.gradedAt ?? g.submittedAt ?? new Date().toISOString(), unread: true, sender: g.gradedBy ?? g.course?.name ?? "Instructor", courseColor: g.course?.color, courseName: g.course?.name, data: g });
          }
        }
      }

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAllItems(items);
    } catch { setAllItems([]); }
    finally { setLoading(false); setRefreshing(false); }
  }, [mailbox, selectedCtx]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { const id = setInterval(() => fetchAll(true), 30_000); return () => clearInterval(id); }, [fetchAll]);

  const handleArchive = (id: string) => {
    setAllItems(prev => prev.filter(c => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const filteredItems = allItems.filter(item => {
    if (mailbox === "submission_comments") return true;
    if (category !== "all") {
      if (category === "messages" && item.type !== "message") return false;
      if (category === "assignments" && item.type !== "assignment") return false;
      if (category === "announcements" && item.type !== "announcement") return false;
      if (category === "quizzes" && item.type !== "quiz" && item.type !== "form") return false;
      if (category === "enrollments" && item.type !== "enrollment") return false;
      if (category === "grades" && item.type !== "grade") return false;
    }
    if (mailbox === "unread" && !item.unread) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.subject.toLowerCase().includes(q) || (item.sender ?? "").toLowerCase().includes(q) || item.preview.toLowerCase().includes(q);
  });

  const unreadCount = allItems.filter(i => i.unread && i.type === "message").length;
  const selectedItem = selectedId ? allItems.find(i => i.id === selectedId) ?? null : null;
  const showThread = !!selectedItem && !!currentUserId;
  const currentFilter = MAILBOX_FILTERS.find(f => f.key === mailbox)!;
  const hasActiveFilter = mailbox !== "inbox" || category !== "all";

  return (
    <div className="ibx-root">
      <style>{GLOBAL_CSS}</style>

      <div className={`ibx-overlay${sidebarOpen ? " visible" : ""}`} onClick={() => setSidebarOpen(false)} style={{ zIndex: 150 }} />

      {/* ── Topbar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0, zIndex: 10, minHeight: 54 }}>
        <button className="ibx-btn ibx-icon-btn ibx-hamburger" onClick={() => setSidebarOpen(true)} style={{ width: 38, height: 38, flexShrink: 0 }}>
          <Menu size={17} />
        </button>

        {(!isMobile || searchOpen) && (
          <div className="ibx-search-wrap"
            style={{ flex: 1, maxWidth: isMobile ? "100%" : 440, display: "flex", alignItems: "center", gap: 8, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "0 11px", height: 38, transition: "border-color 0.15s" }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = C.maroon)}
            onBlurCapture={e => (e.currentTarget.style.borderColor = C.border)}
          >
            <Search size={13} style={{ color: C.textMuted, flexShrink: 0 }} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search conversations…"
              autoFocus={isMobile && searchOpen}
              style={{ flex: 1, border: "none", outline: "none", fontFamily: FONT, color: C.text, background: "transparent", fontSize: 14 }}
            />
            {(searchQuery || (isMobile && searchOpen)) && (
              <button className="ibx-btn" onClick={() => { setSearchQuery(""); if (isMobile) setSearchOpen(false); }} style={{ border: "none", background: "none", color: C.textMuted, width: 18, height: 18, padding: 0 }}><X size={13} /></button>
            )}
          </div>
        )}

        {isMobile && !searchOpen && (
          <button className="ibx-btn ibx-icon-btn" onClick={() => setSearchOpen(true)} style={{ width: 38, height: 38, flexShrink: 0 }}><Search size={15} /></button>
        )}

        {isMobile && !searchOpen && (
          <button className="ibx-btn ibx-icon-btn" onClick={() => setFilterOpen(true)}
            style={{ width: 38, height: 38, flexShrink: 0, position: "relative", color: hasActiveFilter ? C.maroon : C.textLight, background: hasActiveFilter ? C.maroonMid : "none", borderColor: hasActiveFilter ? C.maroonBorder : C.border }}>
            <Filter size={14} />
            {hasActiveFilter && <span style={{ position: "absolute", top: 7, right: 7, width: 5, height: 5, borderRadius: "50%", background: C.maroon }} />}
          </button>
        )}

        {!isMobile && (
          <>
            <div ref={pickerRef} style={{ position: "relative", flexShrink: 0 }}>
              <button className="ibx-btn ibx-icon-btn" title="Find recipient" onClick={() => setPickerOpen(v => !v)}><UserRound size={15} /></button>
              {pickerOpen && (
                <div className="ibx-dropdown" style={{ right: 0, left: "auto", width: 300 }}>
                  <PersonPickerDropdown courseOptions={courses} onSelectUser={u => { setComposeFor(u); setComposing(true); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />
                </div>
              )}
            </div>
            <button className="ibx-btn ibx-icon-btn" title="Refresh" onClick={() => fetchAll(true)} style={{ flexShrink: 0 }}>
              <RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            </button>
            {selectedItem && (
              <div className="ibx-topbar-actions" style={{ display: "flex", gap: 4, paddingLeft: 6, borderLeft: `1px solid ${C.border}` }}>
                <button className="ibx-btn ibx-icon-btn" title="Delete" onClick={async () => {
                  if (selectedItem.type === "message") {
                    await fetch(`${API_BASE}/${selectedId}`, { method: "DELETE" });
                  }
                  handleArchive(selectedId!);
                }} style={{ color: C.danger, borderColor: C.danger + "40" }}><Trash2 size={14} /></button>
              </div>
            )}
          </>
        )}

        {(!isMobile || !searchOpen) && (
          <button className="ibx-btn ibx-compose-btn" onClick={() => { setComposeFor(undefined); setComposing(true); }}
            style={{ padding: "0 16px", height: 38, borderRadius: 8, background: C.maroon, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, gap: 7, flexShrink: 0, position: "relative" }}
            onMouseEnter={e => (e.currentTarget.style.background = C.maroonDark)}
            onMouseLeave={e => (e.currentTarget.style.background = C.maroon)}
          >
            <Pencil size={13} />
            <span className="ibx-compose-btn-text">Compose</span>
            {unreadCount > 0 && (
              <span style={{ position: "absolute", top: -6, right: -6, background: C.maroonDeep, color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 10, padding: "1px 5px", fontFamily: FONT_MONO }}>{unreadCount}</span>
            )}
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="ibx-body">
        {/* Sidebar — desktop: inline; mobile: fixed overlay */}
        <div className={`ibx-sidebar${sidebarOpen ? " open" : ""}`}>
          <SidebarContent
            mailbox={mailbox} category={category}
            onMailbox={v => { setMailbox(v); setSelectedId(null); }}
            onCategory={v => { setCategory(v); setSelectedId(null); }}
            unreadCount={unreadCount}
            courses={courses} selectedCtx={selectedCtx}
            onSelectCtx={v => { setSelectedCtx(v); setSelectedId(null); }}
            onClose={isMobile ? () => setSidebarOpen(false) : undefined}
          />
        </div>

        {/* List panel */}
        <div className={`ibx-list-panel${isMobile && showThread ? " hidden-mobile" : ""}`}>
          <div style={{ padding: "10px 14px 9px", borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: C.surface }}>
            {selectedIds.size > 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button className="ibx-btn" onClick={() => setSelectedIds(new Set())} style={{ border: "none", background: "none", color: C.textMuted, padding: 0, width: 20, height: 20 }}><X size={14} /></button>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{selectedIds.size} selected</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button className="ibx-btn" onClick={() => {
                    setSelectedIds(new Set(filteredItems.map(i => i.id)));
                  }} style={{ fontSize: 12, color: C.maroon, border: "none", background: "none", fontWeight: 600, padding: "4px 8px" }}>
                    Select All
                  </button>
                  <button className="ibx-btn" onClick={async () => {
                    const ids = Array.from(selectedIds);
                    await Promise.all(ids.map(id => {
                      const item = allItems.find(i => i.id === id);
                      if (item?.type === "message") return fetch(`${API_BASE}/${id}`, { method: "DELETE" });
                      return Promise.resolve();
                    }));
                    setAllItems(prev => prev.filter(i => !selectedIds.has(i.id)));
                    if (selectedId && selectedIds.has(selectedId)) setSelectedId(null);
                    setSelectedIds(new Set());
                  }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: C.danger, color: "#fff", border: "none" }}>
                    <Trash2 size={13} />Delete {selectedIds.size}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, flexWrap: "wrap" }}>
                  <currentFilter.Icon size={14} color={C.maroon} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: "nowrap" }}>{currentFilter.label}</span>
                  {selectedCtx && <span style={{ fontSize: 11, background: C.maroonMid, color: C.maroon, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>{selectedCtx.name}</span>}
                  {category !== "all" && <span style={{ fontSize: 11, background: C.border, color: C.textMid, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>{CATEGORY_FILTERS.find(f => f.key === category)?.label}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: C.textMuted, fontFamily: FONT_MONO, flexShrink: 0 }}>{filteredItems.length}</span>
                  {isMobile && (
                    <button className="ibx-btn ibx-icon-btn" onClick={() => fetchAll(true)} style={{ width: 28, height: 28, border: "none" }}>
                      <RefreshCw size={12} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="ibx-scroll" style={{ flex: 1, overflowY: "auto" }}>
            {loading
              ? <ListSkeleton />
              : filteredItems.length === 0
                ? <EmptyState mailbox={mailbox} />
                : filteredItems.map(item => (
                  <InboxRow key={item.id} item={item} selected={selectedId === item.id} checked={selectedIds.has(item.id)}
                    onSelect={() => { setSelectedId(prev => prev === item.id ? null : item.id); setAllItems(prev => prev.map(x => x.id === item.id ? { ...x, unread: false } : x)); }}
                    onCheck={(id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                  />
                ))
            }
          </div>
        </div>

        {/* Thread / detail panel */}
        {showThread ? (
          <div className={`ibx-thread-wrapper${isMobile ? " visible-mobile" : ""}`}>
            <ThreadViewer key={selectedItem!.id} item={selectedItem!} currentUserId={currentUserId} onBack={() => setSelectedId(null)} onArchive={handleArchive} />
          </div>
        ) : (
          !isMobile && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, background: C.bg }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: C.maroonMid, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MailOpen size={22} color={C.maroon} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.textMid, margin: 0 }}>Select an item to view</p>
              <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>Choose from the list on the left</p>
            </div>
          )
        )}
      </div>

      {filterOpen && (
        <MobileFilterSheet category={category} mailbox={mailbox} onCategory={v => { setCategory(v); setSelectedId(null); }} onMailbox={v => { setMailbox(v); setSelectedId(null); }} onClose={() => setFilterOpen(false)} unreadCount={unreadCount} />
      )}
      {composing && (
        <ComposeModal initialRecipient={composeFor} courseOptions={courses} onClose={() => setComposing(false)} onSent={() => fetchAll()} />
      )}
    </div>
  );
}