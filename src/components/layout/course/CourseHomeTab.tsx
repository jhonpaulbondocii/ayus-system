"use client";

// src/components/layout/course/CourseHomeTab.tsx

import { useState, useEffect, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  MAROON, FONT,
  fmtDate, fmtDue, normalizeAnnouncement,
} from "./helpers";
import type {
  Course, Membership, Group,
  Assignment as BaseAssignment, Announcement, RawAnnouncement,
} from "./types";

type Assignment = BaseAssignment & { createdById?: string; status?: string; _isAssignedToYou?: boolean; };

interface Props {
  course: Course;
  membership: Membership | null;
  groups: Group[];
  courseId: string;
  canManageAnnouncements: boolean;
  canManageAssignments: boolean;
  canManagePeople: boolean;
  canManageCourse: boolean;
  isHead: boolean;
  currentUserId: string;
  onTabChange: (tab: string) => void;
}

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
interface ActivityItem {
  id: string;
  type: "submission" | "announcement" | "enrollment" | "grade" | "general" | "form";
  text: string;
  user?: string;
  time: string;
  ts: number;
}

interface EnrollmentItem {
  id: string;
  name: string;
  image?: string | null;
  role: string;
  joinedAt: string;
}

interface Stats {
  people: number;
  announcements: number;
  assignments: number;
  forms: number;
}

interface PersonItem {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: string;
}

interface FormItem {
  id: string;
  title: string;
  dueDate: string | null;
  published: boolean;
  _isAssignedToYou?: boolean;
  _formRole?: string;
  isCreator?: boolean;
}

interface StatItem {
  label: string;
  value: number | string;
  color: string;
  bg: string;
  onClick: () => void;
  icon: ReactNode;
}

/* ─────────────────────────────────────────────────────────────────────────────
   CSS — matches admin CourseHomePage style exactly
───────────────────────────────────────────────────────────────────────────── */
const MAROON_LIGHT = "#fdf2f2";

const buildCss = () => `
  *, *::before, *::after { box-sizing: border-box; }

  .ch-root {
    font-family: 'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;
    background: #f1f1f0;
    min-height: 100%;
    overflow-y: auto;
    -webkit-font-smoothing: antialiased;
    color: #111827;
  }

  /* ── Header ── */
  .ch-header {
    background: ${MAROON};
    padding: 0 20px;
    display: flex;
    align-items: flex-end;
    min-height: 80px;
  }
  .ch-header-content {
    padding: 18px 0 16px;
    flex: 1;
    min-width: 0;
  }
  .ch-eyebrow {
    font-size: 9px;
    font-weight: 700;
    color: rgba(255,255,255,.4);
    text-transform: uppercase;
    letter-spacing: .22em;
    margin: 0 0 5px;
  }
  .ch-title {
    font-size: clamp(15px, 4vw, 20px);
    font-weight: 900;
    color: #fff;
    margin: 0;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .ch-course-meta {
    font-size: 11px;
    color: rgba(255,255,255,.5);
    font-weight: 500;
    margin: 4px 0 0;
  }

  /* ── View tabs (Head only) ── */
  .ch-view-tabs {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    margin-top: 12px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .ch-view-tabs::-webkit-scrollbar { display: none; }
  .ch-view-tab {
    font-size: 11px;
    font-weight: 700;
    color: rgba(255,255,255,.55);
    padding: 7px 14px 8px;
    border-radius: 8px 8px 0 0;
    background: transparent;
    border: none;
    cursor: pointer;
    letter-spacing: .02em;
    white-space: nowrap;
    transition: all .15s;
    flex-shrink: 0;
  }
  .ch-view-tab:hover { color: rgba(255,255,255,.85); }
  .ch-view-tab.active {
    background: #f1f1f0;
    color: ${MAROON};
    cursor: default;
  }

  /* ── Stats strip ── */
  .ch-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: #fff;
    border-bottom: 1px solid #e9eaeb;
  }
  .ch-stat {
    padding: 12px 10px;
    border-right: 1px solid #f0f0f0;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    cursor: default;
    transition: background .12s;
  }
  .ch-stat.clickable { cursor: pointer; }
  .ch-stat.clickable:hover { background: #fafafa; }
  .ch-stat:last-child { border-right: none; }
  .ch-stat-icon {
    width: 30px; height: 30px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .ch-stat-value {
    font-size: clamp(16px, 3.5vw, 20px);
    font-weight: 900;
    line-height: 1;
  }
  .ch-stat-label {
    font-size: 9px;
    font-weight: 600;
    color: #9ca3af;
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: .04em;
  }

  /* ── Body ── */
  .ch-body {
    padding: 14px 14px 32px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* ── Card ── */
  .ch-card {
    background: #fff;
    border-radius: 14px;
    border: 1px solid #e9eaeb;
    overflow: hidden;
  }
  .ch-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px 0;
    gap: 8px;
  }
  .ch-card-title {
    font-size: 10px;
    font-weight: 800;
    color: #111827;
    text-transform: uppercase;
    letter-spacing: .1em;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .ch-card-link {
    font-size: 11px;
    font-weight: 700;
    color: ${MAROON};
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-family: 'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .ch-card-link:hover { text-decoration: underline; }

  /* ── Activity list ── */
  .ch-activity-list {
    padding: 4px 16px 14px;
    display: flex;
    flex-direction: column;
  }
  .ch-activity-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid #f3f4f6;
  }
  .ch-activity-item:last-child { border-bottom: none; }
  .ch-activity-text {
    font-size: 12px;
    color: #374151;
    line-height: 1.55;
    margin: 0;
  }
  .ch-activity-user {
    font-weight: 700;
    color: #111827;
  }
  .ch-activity-time {
    font-size: 10.5px;
    color: #9ca3af;
    margin: 3px 0 0;
  }

  /* ── View more ── */
  .ch-view-more {
    width: 100%;
    margin-top: 8px;
    padding: 8px;
    background: #f9fafb;
    border: 1px solid #e9eaeb;
    border-radius: 8px;
    font-size: 11.5px;
    font-weight: 700;
    color: ${MAROON};
    cursor: pointer;
    font-family: 'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;
    transition: background .12s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
  }
  .ch-view-more:hover { background: ${MAROON_LIGHT}; }

  /* ── Enrollment rows ── */
  .ch-enroll-list {
    padding: 8px 16px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ch-enroll-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    background: #fafafa;
    border-radius: 10px;
    border: 1px solid #f0f0f0;
    transition: background .12s;
  }
  .ch-enroll-item:hover { background: ${MAROON_LIGHT}; }
  .ch-enroll-name {
    font-size: 12px;
    font-weight: 700;
    color: #111827;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ch-enroll-meta {
    font-size: 10.5px;
    color: #9ca3af;
    margin: 1px 0 0;
  }

  /* ── Role badge ── */
  .ch-role-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 7px;
    border-radius: 20px;
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .04em;
    flex-shrink: 0;
    margin-left: auto;
  }

  /* ── Badge ── */
  .ch-badge {
    font-size: 9px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 20px;
    display: inline-block;
    white-space: nowrap;
  }

  /* ── Announcement rows ── */
  .ch-ann-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 16px;
    border-bottom: 1px solid #f3f4f6;
    cursor: pointer;
    transition: background .1s;
  }
  .ch-ann-item:last-child { border-bottom: none; }
  .ch-ann-item:hover { background: #fafafa; }
  .ch-ann-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* ── Upcoming due rows ── */
  .ch-due-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 16px;
    border-bottom: 1px solid #f3f4f6;
    cursor: pointer;
    transition: background .1s;
  }
  .ch-due-item:last-child { border-bottom: none; }
  .ch-due-item:hover { background: #fafafa; }
  .ch-due-icon {
    width: 30px; height: 30px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  /* ── Progress bar ── */
  .ch-bar-track { height: 5px; background: #f3f4f6; border-radius: 99px; overflow: hidden; }
  .ch-bar-fill  { height: 100%; border-radius: 99px; background: linear-gradient(90deg,#7b1113,#b91c1c); transition: width .5s ease; }

  /* ── Spinner ── */
  .ch-spinner {
    width: 14px; height: 14px;
    border: 2px solid #f0e4e4;
    border-top: 2px solid ${MAROON};
    border-radius: 50%;
    animation: ch-spin .8s linear infinite;
    flex-shrink: 0;
  }
  @keyframes ch-spin { to { transform: rotate(360deg); } }

  /* ── Empty ── */
  .ch-empty {
    font-size: 12px;
    color: #9ca3af;
    text-align: center;
    padding: 14px 0;
    margin: 0;
  }

  /* ══════════════════════════════════════
     ACTIVITY DRAWER
  ══════════════════════════════════════ */
  .act-overlay {
    position: fixed; inset: 0; z-index: 1000;
    display: flex; align-items: stretch; justify-content: flex-end;
    background: rgba(0,0,0,.45);
    backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
    animation: act-fadein .18s ease;
  }
  @keyframes act-fadein { from { opacity: 0; } to { opacity: 1; } }

  .act-drawer {
    width: 480px; max-width: 100vw;
    height: 100dvh; background: #fff;
    display: flex; flex-direction: column;
    box-shadow: -4px 0 40px rgba(0,0,0,.12);
    animation: act-slidein .22s cubic-bezier(.25,.46,.45,.94);
  }
  @keyframes act-slidein { from { transform: translateX(100%); } to { transform: translateX(0); } }

  .act-head {
    background: ${MAROON}; padding: 16px 18px 14px;
    display: flex; align-items: center; gap: 10px;
    flex-shrink: 0;
  }
  .act-head-title {
    font-size: 14px; font-weight: 900; color: #fff;
    margin: 0; flex: 1; min-width: 0;
  }
  .act-close {
    width: 32px; height: 32px; border-radius: 8px;
    background: rgba(255,255,255,.15); border: none;
    cursor: pointer; display: flex; align-items: center;
    justify-content: center; flex-shrink: 0;
    transition: background .12s; -webkit-tap-highlight-color: transparent;
  }
  .act-close:hover { background: rgba(255,255,255,.28); }

  .act-toolbar {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 16px; border-bottom: 1px solid #f0f0f0;
    background: #fafafa; flex-shrink: 0; flex-wrap: wrap;
  }
  .act-toolbar-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }

  .act-cb-row {
    display: flex; align-items: center; gap: 6px;
    cursor: pointer; user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
  .act-cb {
    width: 17px; height: 17px; border: 2px solid #d1d5db;
    border-radius: 4px; background: #fff;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: all .12s;
  }
  .act-cb.on, .act-cb.mid { background: ${MAROON}; border-color: ${MAROON}; }
  .act-cb-label { font-size: 12px; font-weight: 700; color: #374151; }
  .act-sel-count { font-size: 11px; font-weight: 600; color: #9ca3af; white-space: nowrap; }

  .act-btn-clear {
    font-size: 11.5px; font-weight: 800; color: #fff;
    background: ${MAROON}; border: none; border-radius: 7px;
    padding: 6px 12px; cursor: pointer;
    font-family: 'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;
    display: flex; align-items: center; gap: 5px;
    transition: opacity .12s; white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
  }
  .act-btn-clear:hover { opacity: .85; }
  .act-btn-clear:disabled { opacity: .38; cursor: default; }

  .act-btn-clearall {
    font-size: 11px; font-weight: 700; color: #6b7280;
    background: none; border: 1px solid #e5e7eb; border-radius: 7px;
    padding: 6px 10px; cursor: pointer;
    font-family: 'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;
    transition: all .12s; white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
  }
  .act-btn-clearall:hover { border-color: ${MAROON}; color: ${MAROON}; }

  .act-list {
    flex: 1; overflow-y: auto; overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }
  .act-item {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 11px 16px; border-bottom: 1px solid #f9fafb;
    cursor: pointer; transition: background .1s;
    -webkit-tap-highlight-color: transparent;
  }
  .act-item:last-child { border-bottom: none; }
  .act-item:hover { background: #fafafa; }
  .act-item.sel { background: ${MAROON_LIGHT}; }
  .act-item-cb {
    width: 17px; height: 17px; border: 2px solid #d1d5db;
    border-radius: 4px; background: #fff;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-top: 7px; transition: all .12s;
  }
  .act-item.sel .act-item-cb { background: ${MAROON}; border-color: ${MAROON}; }

  .act-blank {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 10px; padding: 48px 24px; text-align: center;
  }
  .act-blank-icon {
    width: 52px; height: 52px; border-radius: 50%;
    background: #f3f4f6; display: flex; align-items: center; justify-content: center;
  }
  .act-blank-text { font-size: 13px; font-weight: 600; color: #9ca3af; margin: 0; }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 768px) {
    .ch-header { min-height: 70px; padding: 0 14px; }
    .ch-header-content { padding: 14px 0 12px; }
    .ch-stats { grid-template-columns: repeat(2, 1fr); }
    .ch-stat:nth-child(2) { border-right: none; }
    .ch-stat:nth-child(1),
    .ch-stat:nth-child(2) { border-bottom: 1px solid #f0f0f0; }
    .ch-body { padding: 12px 12px 28px; gap: 10px; }
  }

  @media (max-width: 480px) {
    .ch-header { min-height: 64px; }
    .ch-stat { padding: 10px 8px; gap: 6px; }
    .ch-stat-icon { width: 26px; height: 26px; border-radius: 6px; }
  }

  @media (max-width: 600px) {
    .act-overlay { align-items: flex-end; justify-content: center; }
    .act-drawer {
      width: 100%; height: 90dvh;
      border-radius: 20px 20px 0 0;
      box-shadow: 0 -6px 40px rgba(0,0,0,.16);
      animation: act-slideup .22s cubic-bezier(.25,.46,.45,.94);
    }
    @keyframes act-slideup { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .act-btn-clearall { display: none; }
  }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
function relativeTime(iso: string | Date): string {
  const now  = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  if (diff < 60000)    return "Just now";
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ─────────────────────────────────────────────────────────────────────────────
   AVATAR
───────────────────────────────────────────────────────────────────────────── */
function Avatar({ name, image, size = 32 }: { name: string; image?: string | null; size?: number }) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    );
  }
  const initials = name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: MAROON_LIGHT, color: MAROON,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.34, fontWeight: 800, flexShrink: 0, letterSpacing: "-0.02em",
    }}>
      {initials || name?.[0]?.toUpperCase()}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ACTIVITY DOT
───────────────────────────────────────────────────────────────────────────── */
type ActivityType = ActivityItem["type"];

const ACTIVITY_CFG: Record<ActivityType, { bg: string; stroke: string; path: React.ReactNode }> = {
  submission:   { bg: "#eff6ff", stroke: "#3b82f6", path: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round"/><polyline points="17 8 12 3 7 8" strokeLinecap="round"/><line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round"/></> },
  announcement: { bg: MAROON_LIGHT, stroke: MAROON, path: <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round"/> },
  enrollment:   { bg: "#f0fdf4", stroke: "#16a34a", path: <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14" strokeLinecap="round"/><line x1="23" y1="11" x2="17" y2="11" strokeLinecap="round"/></> },
  grade:        { bg: "#fefce8", stroke: "#ca8a04", path: <><path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round"/></> },
  form:         { bg: "#f0f9ff", stroke: "#0891b2", path: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10h8M8 14h5" strokeLinecap="round"/><circle cx="17" cy="14" r="2.5"/></> },
  general:      { bg: "#f9fafb", stroke: "#9ca3af", path: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/></> },
};

function ActivityDot({ type, size = 30 }: { type: ActivityType; size?: number }) {
  const c = ACTIVITY_CFG[type];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width={size * 0.43} height={size * 0.43} fill="none" stroke={c.stroke} strokeWidth={2} viewBox="0 0 24 24">{c.path}</svg>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ROLE BADGE
───────────────────────────────────────────────────────────────────────────── */
const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  TEACHER: { bg: "#eff6ff", color: "#1d4ed8" },
  STUDENT: { bg: "#f0fdf4", color: "#15803d" },
  ADMIN:   { bg: MAROON_LIGHT, color: MAROON },
  STAFF:   { bg: "#fefce8", color: "#a16207" },
};

function RoleBadge({ role }: { role: string }) {
  const c = ROLE_COLORS[role.toUpperCase()] ?? { bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span className="ch-role-badge" style={{ background: c.bg, color: c.color }}>{role}</span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ACTIVITY DRAWER
───────────────────────────────────────────────────────────────────────────── */
function ActivityDrawer({
  activity, onClose, onClearItems,
}: {
  activity: ActivityItem[];
  onClose: () => void;
  onClearItems: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected  = activity.length > 0 && selected.size === activity.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected || someSelected) setSelected(new Set());
    else setSelected(new Set(activity.map(a => a.id)));
  }
  function toggleItem(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function handleClearSelected() {
    if (!selected.size) return;
    onClearItems(Array.from(selected));
    setSelected(new Set());
  }
  function handleClearAll() {
    onClearItems(activity.map(a => a.id));
    setSelected(new Set());
  }
  function onBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="act-overlay" onClick={onBackdropClick} role="dialog" aria-modal="true">
      <div className="act-drawer">
        <div className="act-head">
          <p className="act-head-title">
            All Activity
            {activity.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.5)", marginLeft: 7 }}>
                {activity.length} item{activity.length !== 1 ? "s" : ""}
              </span>
            )}
          </p>
          <button className="act-close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth={2.2} viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {activity.length > 0 && (
          <div className="act-toolbar">
            <div className="act-toolbar-left">
              <div className="act-cb-row" onClick={toggleAll} role="checkbox"
                aria-checked={allSelected ? "true" : someSelected ? "mixed" : "false"}
                tabIndex={0} onKeyDown={e => e.key === " " && (e.preventDefault(), toggleAll())}>
                <div className={`act-cb ${allSelected ? "on" : someSelected ? "mid" : ""}`}>
                  {allSelected && <svg width="9" height="9" fill="none" stroke="#fff" strokeWidth={2.5} viewBox="0 0 12 12"><polyline points="1.5,6 4.5,9 10.5,3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  {someSelected && !allSelected && <svg width="8" height="2" fill="none" stroke="#fff" strokeWidth={2.5} viewBox="0 0 8 2"><line x1="0" y1="1" x2="8" y2="1" strokeLinecap="round"/></svg>}
                </div>
                <span className="act-cb-label">Select all</span>
              </div>
              {selected.size > 0 && <span className="act-sel-count">{selected.size} selected</span>}
            </div>
            <button className="act-btn-clear" onClick={handleClearSelected} disabled={selected.size === 0}>
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6" strokeLinecap="round"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round"/>
              </svg>
              {selected.size > 0 ? `Clear (${selected.size})` : "Clear"}
            </button>
            <button className="act-btn-clearall" onClick={handleClearAll}>Clear all</button>
          </div>
        )}

        {activity.length === 0 ? (
          <div className="act-blank">
            <div className="act-blank-icon">
              <svg width="22" height="22" fill="none" stroke="#9ca3af" strokeWidth={1.8} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/>
                <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="act-blank-text">No activity to show.</p>
          </div>
        ) : (
          <div className="act-list" role="list">
            {activity.map(item => {
              const isSel = selected.has(item.id);
              return (
                <div key={item.id} className={`act-item${isSel ? " sel" : ""}`} onClick={() => toggleItem(item.id)} role="listitem">
                  <div className="act-item-cb">
                    {isSel && <svg width="9" height="9" fill="none" stroke="#fff" strokeWidth={2.5} viewBox="0 0 12 12"><polyline points="1.5,6 4.5,9 10.5,3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <ActivityDot type={item.type} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12.5, color: "#374151", margin: 0, lineHeight: 1.55 }}>
                      {item.user && <span style={{ fontWeight: 700, color: "#111827" }}>{item.user} </span>}
                      {item.text}
                    </p>
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: "3px 0 0" }}>{item.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   BUILD STAFF ACTIVITY FEED
───────────────────────────────────────────────────────────────────────────── */
function buildStaffActivity(
  announcements: Announcement[],
  assignments: Assignment[],
  forms: FormItem[],
  people: PersonItem[],
  currentUserId: string,
): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const a of announcements) {
    items.push({
      id: `ann-${a.id}`,
      type: "announcement",
      text: `New announcement: "${a.title}"`,
      user: a.authorName ?? undefined,
      time: relativeTime(a.createdAt ?? new Date()),
      ts: a.createdAt ? new Date(a.createdAt).getTime() : Date.now(),
    });
  }

  for (const a of assignments) {
    const ts = a.dueDate ? new Date(a.dueDate).getTime() : Date.now();
    items.push({
      id: `asgn-${a.id}`,
      type: "submission",
      text: a._isAssignedToYou
        ? `Assignment assigned to you: "${a.title}"${a.dueDate ? ` — due ${fmtDue(a.dueDate)}` : ""}`
        : `You created assignment: "${a.title}"${a.dueDate ? ` — due ${fmtDue(a.dueDate)}` : ""}`,
      time: relativeTime(new Date(ts)),
      ts,
    });

    const sub = (a.submissions ?? [])[0];
    if (sub?.grade != null && sub.submittedAt) {
      const gradeTs = new Date(sub.submittedAt).getTime();
      items.push({
        id: `grade-${a.id}`,
        type: "grade",
        text: `You received a grade on "${a.title}": ${sub.grade}/${a.points} pts`,
        time: relativeTime(new Date(gradeTs)),
        ts: gradeTs,
      });
    }
  }

  for (const f of forms) {
    const isCreator = f.isCreator;
    items.push({
      id: `form-${f.id}`,
      type: "form",
      text: isCreator
        ? `You created form: "${f.title}"${f.dueDate ? ` — due ${fmtDue(f.dueDate)}` : ""}`
        : `Form assigned to you: "${f.title}"${f.dueDate ? ` — due ${fmtDue(f.dueDate)}` : ""}`,
      time: relativeTime(new Date()),
      ts: Date.now() - 1000,
    });
  }

  for (const p of people.slice(0, 10)) {
    const isMe = p.id === currentUserId;
    items.push({
      id: `enroll-${p.id}`,
      type: "enrollment",
      text: isMe
        ? `You joined as ${p.role}`
        : `joined as ${p.role}`,
      user: isMe ? undefined : p.name,
      time: "Recently",
      ts: 0,
    });
  }

  return items.sort((a, b) => b.ts - a.ts).slice(0, 100);
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────────────────────── */
const PREVIEW_COUNT = 5;

export default function CourseHomeTab({
  course, membership, groups, courseId,
  canManageAnnouncements, canManageAssignments, canManagePeople,
  isHead, currentUserId = "", onTabChange,
}: Props) {
  void membership;
  void canManageAnnouncements;
  void canManageAssignments;

  const router = useRouter();

  const [headView, setHeadView]           = useState<"admin" | "staff">("admin");
  const [assignments, setAssignments]     = useState<Assignment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [forms, setForms]                 = useState<FormItem[]>([]);
  const [people, setPeople]               = useState<PersonItem[]>([]);
  const [stats, setStats]                 = useState<Stats>({ people: 0, announcements: 0, assignments: 0, forms: 0 });
  const [headActivity, setHeadActivity]   = useState<ActivityItem[]>([]);
  const [enrollments, setEnrollments]     = useState<EnrollmentItem[]>([]);
  const [loading, setLoading]             = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [showDrawer, setShowDrawer]       = useState(false);
  const [clearedStaffIds, setClearedStaffIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const base = `/api/courses/${courseId}`;
    Promise.all([
      fetch(`${base}/assignments`).then(r => r.json()).catch(() => ({ assignments: [] })),
      fetch(`${base}/announcements`).then(r => r.json()).catch(() => ({ announcements: [] })),
      fetch(`${base}/people`).then(r => r.json()).catch(() => ({ people: [] })),
      fetch(`${base}/forms`).then(r => r.json()).catch(() => ({ forms: [] })),
    ]).then(([aData, anData, pData, fData]) => {
      setAssignments(aData.assignments ?? []);
      const raw = anData.announcements ?? anData.items ?? anData.data ?? [];
      setAnnouncements(raw.map((item: RawAnnouncement, i: number) => normalizeAnnouncement(item, i)));
      setPeople(pData.people ?? []);
      setForms(fData.forms ?? []);
      setLoading(false);
      setLoadingActivity(false);
    });
  }, [courseId]);

  useEffect(() => {
    if (!isHead) return;

    fetch(`/api/admin/courses/${courseId}/activity`)
      .then(async r => {
        if (!r.ok) throw new Error(`activity ${r.status}`);
        return r.json();
      })
      .then(d => {
        setHeadActivity(d.activity ?? []);
        setStats(d.stats ?? { people: 0, announcements: 0, assignments: 0, forms: 0 });
      })
      .catch(console.error)
      .finally(() => setLoadingActivity(false));

    fetch(`/api/admin/courses/${courseId}/enrollments/recent`)
  .then(async r => {
    if (!r.ok) return { enrollments: [] };
    return r.json();
  })
  .then(d => setEnrollments(d.enrollments ?? []))
  .catch(() => setEnrollments([]));
  }, [courseId, isHead]);

  const handleClearHeadItems = useCallback((ids: string[]) => {
    setHeadActivity(prev => prev.filter(a => !ids.includes(a.id)));
  }, []);

  const staffActivity = useMemo(() => {
    if (loading) return [];
    return buildStaffActivity(announcements, assignments, forms, people, currentUserId)
      .filter(item => !clearedStaffIds.has(item.id));
  }, [loading, announcements, assignments, forms, people, currentUserId, clearedStaffIds]);

  const handleClearStaffItems = useCallback((ids: string[]) => {
    setClearedStaffIds(prev => { const s = new Set(prev); ids.forEach(id => s.add(id)); return s; });
  }, []);

  const now = new Date();

  // Derived values
  const totalAssignments = assignments.length;
  const mySubmitted      = assignments.filter(a => (a.submissions ?? [])[0]?.submittedAt).length;
  const myTotalPts       = assignments.reduce((s, a) => s + (a.points || 0), 0);
  const myEarnedPts      = assignments.reduce((s, a) => s + ((a.submissions ?? [])[0]?.grade ?? 0), 0);
  const myGradePct       = myTotalPts > 0 ? Math.round((myEarnedPts / myTotalPts) * 100) : 0;
  const unreadCount      = announcements.filter(a => !a.read).length;
  const dueThisWeek      = assignments.filter(a =>
    a.dueDate && new Date(a.dueDate) > now && new Date(a.dueDate) <= new Date(now.getTime() + 7 * 86400000)
  ).length;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 220, color: "#9ca3af", fontSize: 13, fontFamily: FONT, gap: 10 }}>
        <div style={{ width: 16, height: 16, border: `2px solid #f0e4e4`, borderTop: `2px solid ${MAROON}`, borderRadius: "50%", animation: "ch-spin .8s linear infinite" }} />
        Loading dashboard…
        <style>{`@keyframes ch-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────────
     STAT ITEMS
  ───────────────────────────────────────────────────────────────────────── */
  // Admin/Head stats
  const adminStatItems: StatItem[] = [
    {
      label: "Staff",
      value: stats.people || people.length,
      color: "#2563eb", bg: "#eff6ff",
      onClick: () => onTabChange("People"),
      icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round"/></>,
    },
    {
      label: "Assignments",
      value: stats.assignments || totalAssignments,
      color: MAROON, bg: MAROON_LIGHT,
      onClick: () => onTabChange("Assignments"),
      icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9" strokeLinecap="round"/><line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round"/></>,
    },
    {
      label: "Forms",
      value: stats.forms || forms.length,
      color: "#0891b2", bg: "#ecfeff",
      onClick: () => onTabChange("Forms"),
      icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10h8M8 14h5" strokeLinecap="round"/><circle cx="17" cy="14" r="2.5"/></>,
    },
    {
      label: "Announce.",
      value: stats.announcements || announcements.length,
      color: "#7c3aed", bg: "#f5f3ff",
      onClick: () => onTabChange("Announcements"),
      icon: <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round"/>,
    },
  ];

  // Staff/My Dashboard stats
  const myStatItems: StatItem[] = [
    {
      label: "Submitted",
      value: `${mySubmitted}/${totalAssignments}`,
      color: MAROON, bg: MAROON_LIGHT,
      onClick: () => onTabChange("Assignments"),
      icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9" strokeLinecap="round"/><line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round"/></>,
    },
    {
      label: "Grade",
      value: `${myGradePct}%`,
      color: "#0891b2", bg: "#ecfeff",
      onClick: () => onTabChange("Grades"),
      icon: <><line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round"/><line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round"/><line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round"/></>,
    },
    {
      label: "Unread",
      value: unreadCount,
      color: unreadCount > 0 ? "#7c3aed" : "#6b7280",
      bg: unreadCount > 0 ? "#f5f3ff" : "#f9fafb",
      onClick: () => onTabChange("Announcements"),
      icon: <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round"/>,
    },
    {
      label: "Due / Week",
      value: dueThisWeek,
      color: dueThisWeek > 0 ? "#b91c1c" : "#6b7280",
      bg: dueThisWeek > 0 ? "#fef2f2" : "#f9fafb",
      onClick: () => onTabChange("Assignments"),
      icon: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" strokeLinecap="round"/></>,
    },
  ];

  /* ─────────────────────────────────────────────────────────────────────────
     SHARED RENDER HELPERS
  ───────────────────────────────────────────────────────────────────────── */
  function renderStatStrip(items: StatItem[]) {
    return (
      <div className="ch-stats">
        {items.map(s => (
          <div
            key={s.label}
            className="ch-stat clickable"
            onClick={s.onClick}
          >
            <div className="ch-stat-icon" style={{ background: s.bg }}>
              <svg width="15" height="15" fill="none" stroke={s.color} strokeWidth={2} viewBox="0 0 24 24">
                {s.icon}
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="ch-stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="ch-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderActivityCard(activity: ActivityItem[], actLoading: boolean) {
    const preview    = activity.slice(0, PREVIEW_COUNT);
    const extraCount = activity.length - PREVIEW_COUNT;
    return (
      <div className="ch-card">
        <div className="ch-card-head">
          <p className="ch-card-title">
            Recent Activity
            {activity.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "none", letterSpacing: 0, marginLeft: 5 }}>
                ({activity.length})
              </span>
            )}
          </p>
          {!actLoading && activity.length > 0 && (
            <button className="ch-card-link" onClick={() => setShowDrawer(true)}>View all →</button>
          )}
        </div>
        <div className="ch-activity-list">
          {actLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0" }}>
              <div className="ch-spinner" />
              <span style={{ fontSize: 12, color: "#9ca3af" }}>Loading…</span>
            </div>
          ) : activity.length === 0 ? (
            <p className="ch-empty">No recent activity.</p>
          ) : (
            <>
              {preview.map(item => (
                <div key={item.id} className="ch-activity-item">
                  <ActivityDot type={item.type} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="ch-activity-text">
                      {item.user && <span className="ch-activity-user">{item.user} </span>}
                      {item.text}
                    </p>
                    <p className="ch-activity-time">{item.time}</p>
                  </div>
                </div>
              ))}
              {extraCount > 0 && (
                <button className="ch-view-more" onClick={() => setShowDrawer(true)}>
                  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round"/>
                    <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round"/>
                  </svg>
                  {extraCount} more — View all
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  function renderEnrollmentsCard(items: EnrollmentItem[]) {
    return (
      <div className="ch-card">
        <div className="ch-card-head">
          <p className="ch-card-title">Recent Enrollments</p>
          {canManagePeople && (
            <button className="ch-card-link" onClick={() => onTabChange("People")}>View all</button>
          )}
        </div>
        <div className="ch-enroll-list">
          {items.length === 0 ? (
            <p className="ch-empty">No recent enrollments.</p>
          ) : items.map(e => (
            <div key={e.id} className="ch-enroll-item">
              <Avatar name={e.name} image={e.image} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="ch-enroll-name">{e.name}</p>
                <p className="ch-enroll-meta">{e.joinedAt}</p>
              </div>
              <RoleBadge role={e.role} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderAnnouncementsCard(items: Announcement[]) {
    const unread = items.filter(a => !a.read).length;
    return (
      <div className="ch-card">
        <div className="ch-card-head">
          <p className="ch-card-title">
            Announcements
            {unread > 0 && (
              <span className="ch-badge" style={{ background: MAROON, color: "#fff", marginLeft: 4 }}>{unread} new</span>
            )}
          </p>
          <button className="ch-card-link" onClick={() => onTabChange("Announcements")}>View all →</button>
        </div>
        <div style={{ paddingBottom: 4 }}>
          {items.length === 0 ? (
            <p className="ch-empty">No announcements yet.</p>
          ) : items.slice(0, 5).map(a => (
            <div key={a.id} className="ch-ann-item" onClick={() => onTabChange("Announcements")}>
              <div className="ch-ann-dot" style={{ background: a.read ? "transparent" : MAROON, border: a.read ? "1.5px solid #e5e7eb" : "none" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: a.read ? 500 : 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 1 }}>{a.authorName} · {fmtDate(a.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderUpcomingCard(items: Assignment[]) {
    const upcoming = items
      .filter(a => a.dueDate && new Date(a.dueDate) >= now)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5);
    return (
      <div className="ch-card">
        <div className="ch-card-head">
          <p className="ch-card-title">Upcoming Due Dates</p>
          <button className="ch-card-link" onClick={() => onTabChange("Assignments")}>View all →</button>
        </div>
        <div style={{ paddingBottom: 4 }}>
          {upcoming.length === 0 ? (
            <p className="ch-empty">No upcoming due dates.</p>
          ) : upcoming.map(a => {
            const daysLeft  = a.dueDate ? Math.ceil((new Date(a.dueDate).getTime() - now.getTime()) / 86400000) : null;
            const urgent    = daysLeft !== null && daysLeft <= 2;
            const submitted = !!(a.submissions ?? [])[0]?.submittedAt;
            return (
              <div key={a.id} className="ch-due-item"
                onClick={() => isHead ? onTabChange("Assignments") : router.push(`/courses/${courseId}/assignments/${a.id}`)}>
                <div className="ch-due-icon" style={{ background: submitted ? "#f0fdf4" : urgent ? "#fef2f2" : "#f9fafb" }}>
                  <svg width="14" height="14" fill="none" stroke={submitted ? "#15803d" : MAROON} strokeWidth={2} viewBox="0 0 24 24">
                    <rect x="4" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                  <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>{a.assignmentGroup} · {a.points} pts</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {submitted ? (
                    <span className="ch-badge" style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>✓ Done</span>
                  ) : (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, color: urgent ? "#b91c1c" : "#6b7280" }}>
                        {daysLeft === 0 ? "Today" : daysLeft === 1 ? "Tomorrow" : `${daysLeft}d`}
                      </div>
                      <div style={{ fontSize: 10, color: "#9ca3af" }}>{fmtDue(a.dueDate)}</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderMyProgressCard() {
    const submitted = assignments.filter(a => (a.submissions ?? [])[0]?.submittedAt);
    const graded    = assignments.filter(a => (a.submissions ?? [])[0]?.grade != null);
    const pct       = totalAssignments > 0 ? Math.min((submitted.length / totalAssignments) * 100, 100) : 0;
    const gradePct  = myTotalPts > 0 ? Math.min((myEarnedPts / myTotalPts) * 100, 100) : 0;

    return (
      <div className="ch-card">
        <div className="ch-card-head">
          <p className="ch-card-title">My Progress</p>
          <button className="ch-card-link" onClick={() => onTabChange("Grades")}>View grades →</button>
        </div>
        <div style={{ padding: "12px 16px 14px" }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Submissions</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: MAROON }}>{submitted.length}/{totalAssignments}</span>
            </div>
            <div className="ch-bar-track"><div className="ch-bar-fill" style={{ width: `${pct}%` }} /></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Overall Grade</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: MAROON }}>{myEarnedPts}/{myTotalPts} pts</span>
            </div>
            <div className="ch-bar-track"><div className="ch-bar-fill" style={{ width: `${gradePct}%` }} /></div>
          </div>
          {graded.length > 0 && (
            <>
              <p style={{ fontSize: 10, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".08em", margin: "10px 0 8px" }}>Recent Grades</p>
              {graded.slice(0, 3).map(a => {
                const grade = (a.submissions ?? [])[0]?.grade ?? 0;
                const p     = a.points > 0 ? Math.round((grade / a.points) * 100) : 0;
                const col   = p >= 75 ? "#15803d" : p >= 50 ? "#b45309" : "#b91c1c";
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: "#fafafa", borderRadius: 8, border: "1px solid #f3f4f6", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "58%" }}>{a.title}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: col }}>{grade}/{a.points}<span style={{ fontWeight: 500, color: "#9ca3af" }}> ({p}%)</span></span>
                  </div>
                );
              })}
            </>
          )}
          {graded.length === 0 && <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", marginTop: 8 }}>No grades yet</p>}
        </div>
      </div>
    );
  }

  function renderMyGroupsCard() {
    const myGroups = groups.filter(g => g.isMember);
    return (
      <div className="ch-card">
        <div className="ch-card-head"><p className="ch-card-title">My Groups</p></div>
        <div style={{ paddingBottom: 4 }}>
          {myGroups.length === 0 ? (
            <p className="ch-empty">You are not in any group yet.</p>
          ) : myGroups.map(g => (
            <div key={g.id} className="ch-due-item" onClick={() => router.push(`/courses/${courseId}/groups/${g.id}`)}>
              <div className="ch-due-icon" style={{ background: MAROON_LIGHT }}>
                <svg width="14" height="14" fill="none" stroke={MAROON} strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>{g.memberCount} member{g.memberCount !== 1 ? "s" : ""} · {g.groupSetName}</div>
              </div>
              <span style={{ fontSize: 11, color: MAROON, fontWeight: 700, flexShrink: 0 }}>Visit →</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────────
     HEAD VIEW
  ───────────────────────────────────────────────────────────────────────── */
  if (isHead) {
    const currentActivity    = headView === "admin" ? headActivity : staffActivity;
    const handleClear        = headView === "admin" ? handleClearHeadItems : handleClearStaffItems;
    const currentStats       = headView === "admin" ? adminStatItems : myStatItems;
    const staffEnrollments: EnrollmentItem[] = people.slice(0, 8).map(p => ({
      id: p.id, name: p.name, image: p.image, role: p.role, joinedAt: "Recently",
    }));
    const currentEnrollments = headView === "admin" ? enrollments : staffEnrollments;

    return (
      <>
        <style>{buildCss()}</style>
        <div className="ch-root">
          {/* Header */}
          <div className="ch-header">
            <div className="ch-header-content">
              <p className="ch-eyebrow">Unit Overview</p>
              <h1 className="ch-title">{course.name}</h1>
              {(course.code || course.term) && (
                <p className="ch-course-meta">{course.code}{course.term ? ` · ${course.term}` : ""}</p>
              )}
              <div className="ch-view-tabs">
                <button className={`ch-view-tab${headView === "admin" ? " active" : ""}`} onClick={() => setHeadView("admin")}>
                  Unit Management
                </button>
                <button className={`ch-view-tab${headView === "staff" ? " active" : ""}`} onClick={() => setHeadView("staff")}>
                  My Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          {renderStatStrip(currentStats)}

          {/* Body */}
          <div className="ch-body">
            {headView === "admin" ? (
              <>
                {renderActivityCard(currentActivity, loadingActivity)}
                {renderEnrollmentsCard(currentEnrollments)}
              </>
            ) : (
              <>
                {renderActivityCard(currentActivity, false)}
                {renderEnrollmentsCard(currentEnrollments)}
                {renderUpcomingCard(assignments)}
                {renderAnnouncementsCard(announcements)}
                {renderMyProgressCard()}
                {renderMyGroupsCard()}
              </>
            )}
          </div>
        </div>

        {showDrawer && (
          <ActivityDrawer
            activity={currentActivity}
            onClose={() => setShowDrawer(false)}
            onClearItems={handleClear}
          />
        )}
      </>
    );
  }

  /* ─────────────────────────────────────────────────────────────────────────
     STAFF / FACULTY VIEW
  ───────────────────────────────────────────────────────────────────────── */
  const staffEnrollments: EnrollmentItem[] = people.slice(0, 8).map(p => ({
    id: p.id, name: p.name, image: p.image, role: p.role, joinedAt: "Recently",
  }));

  return (
    <>
      <style>{buildCss()}</style>
      <div className="ch-root">
        {/* Header */}
        <div className="ch-header">
          <div className="ch-header-content">
            <p className="ch-eyebrow">Course Dashboard</p>
            <h1 className="ch-title">{course.name}</h1>
            {(course.code || course.term) && (
              <p className="ch-course-meta">{course.code}{course.term ? ` · ${course.term}` : ""}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        {renderStatStrip(myStatItems)}

        {/* Body */}
        <div className="ch-body">
          {renderActivityCard(staffActivity, false)}
          {renderEnrollmentsCard(staffEnrollments)}
          {renderUpcomingCard(assignments)}
          {renderAnnouncementsCard(announcements)}
          {renderMyProgressCard()}
          {renderMyGroupsCard()}
        </div>
      </div>

      {showDrawer && (
        <ActivityDrawer
          activity={staffActivity}
          onClose={() => setShowDrawer(false)}
          onClearItems={handleClearStaffItems}
        />
      )}
    </>
  );
}