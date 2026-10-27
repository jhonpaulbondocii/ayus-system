"use client";

// src/components/layout/course/CourseHomeTab.tsx

import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { MAROON, FONT, fmtDue, normalizeAnnouncement } from "./helpers";
import type {
  Course, Membership, Group,
  Assignment as BaseAssignment, Announcement, RawAnnouncement,
} from "./types";

type Assignment = BaseAssignment & { createdById?: string; status?: string; _isAssignedToYou?: boolean };

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
const MAROON_LIGHT = "#fdf2f2";

interface ActivityItem {
  id: string;
  type: "submission" | "announcement" | "enrollment" | "grade" | "general" | "assignment" | "form";
  text: string;
  user?: string;
  time: string;
  ts?: number;
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
  role: string;
}

interface FormItem {
  id: string;
  title: string;
  dueDate: string | null;
  isCreator?: boolean;
}

interface QuickAction {
  key: string;
  label: string;
  desc: string;
  meta?: string;
  tab: string;
  primary?: boolean;
  icon: ReactNode;
}

/* ─────────────────────────────────────────────────────────────────────────────
   ICONS
───────────────────────────────────────────────────────────────────────────── */
const ICONS: Record<string, ReactNode> = {
  announce: <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round" strokeLinejoin="round" />,
  assignment: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="9" x2="15" y2="9" strokeLinecap="round" />
      <line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round" />
    </>
  ),
  form: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M8 10h8M8 14h5" strokeLinecap="round" />
    </>
  ),
  person: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" strokeLinecap="round" />
      <line x1="23" y1="11" x2="17" y2="11" strokeLinecap="round" />
    </>
  ),
  grade: (
    <>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" />
      <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" />
      <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
    </>
  ),
  settings: (
    <>
      <line x1="4" y1="6" x2="20" y2="6" strokeLinecap="round" />
      <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
      <line x1="4" y1="18" x2="20" y2="18" strokeLinecap="round" />
      <circle cx="9" cy="6" r="2" fill="#fff" />
      <circle cx="15" cy="12" r="2" fill="#fff" />
      <circle cx="8" cy="18" r="2" fill="#fff" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
      <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
    </>
  ),
  medical: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </>
  ),
  exam: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4h6v3H9z" />
      <polyline points="9 14 11 16 15 12" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  pill: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-45 12 12)" />
      <line x1="9" y1="9" x2="15" y2="15" strokeLinecap="round" />
    </>
  ),
  chart: (
    <>
      <line x1="6" y1="20" x2="6" y2="10" strokeLinecap="round" />
      <line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round" />
      <line x1="18" y1="20" x2="18" y2="14" strokeLinecap="round" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" strokeLinejoin="round" />
      <path d="M20 17v4H6.5A2.5 2.5 0 0 1 4 18.5" strokeLinecap="round" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
      <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  card: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </>
  ),
  log: (
    <>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" strokeLinejoin="round" />
      <polyline points="14 3 14 9 20 9" strokeLinejoin="round" />
      <line x1="8" y1="13" x2="16" y2="13" strokeLinecap="round" />
      <line x1="8" y1="17" x2="13" y2="17" strokeLinecap="round" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" strokeLinejoin="round" />
      <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" />
    </>
  ),
  box: (
    <>
      <path d="M21 8l-9-5-9 5v8l9 5 9-5z" strokeLinejoin="round" />
      <polyline points="3.3 7 12 12 20.7 7" strokeLinejoin="round" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.9" strokeLinecap="round" />
      <path d="M16 3.1a4 4 0 0 1 0 7.8" strokeLinecap="round" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
    </>
  ),
};

function Icon({ name, size = 16, stroke = "currentColor" }: { name: keyof typeof ICONS; size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} fill="none" stroke={stroke} strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const ACTIVITY_CFG: Record<ActivityItem["type"], { bg: string; stroke: string; icon: keyof typeof ICONS }> = {
  submission:   { bg: "#eff6ff", stroke: "#3b82f6", icon: "upload" },
  assignment:   { bg: "#eff6ff", stroke: "#3b82f6", icon: "assignment" },
  form:         { bg: "#ecfeff", stroke: "#0891b2", icon: "form" },
  announcement: { bg: MAROON_LIGHT, stroke: MAROON, icon: "announce" },
  enrollment:   { bg: "#f0fdf4", stroke: "#16a34a", icon: "person" },
  grade:        { bg: "#fefce8", stroke: "#ca8a04", icon: "grade" },
  general:      { bg: "#f9fafb", stroke: "#9ca3af", icon: "info" },
};

function ActivityDot({ type, size = 28 }: { type: ActivityItem["type"]; size?: number }) {
  const c = ACTIVITY_CFG[type] ?? ACTIVITY_CFG.general;
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: c.bg, border: "2px solid #fff",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      <Icon name={c.icon} size={Math.round(size * 0.46)} stroke={c.stroke} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CSS (same as admin CourseHomePage)
───────────────────────────────────────────────────────────────────────────── */
const buildCss = () => `
  .ch-root, .ch-root *, .ch-root *::before, .ch-root *::after,
  .act-overlay, .act-overlay *, .act-overlay *::before, .act-overlay *::after { box-sizing: border-box; }

  .ch-root {
    font-family: ${FONT};
    background: #f6f6f5;
    min-height: 100%;
    overflow-y: auto;
    -webkit-font-smoothing: antialiased;
    color: #111827;
  }
  .ch-root :focus-visible,
  .act-overlay :focus-visible { outline: 2px solid ${MAROON}; outline-offset: 2px; }

  /* ── Masthead ── */
  .ch-masthead { background: ${MAROON}; color: #fff; }
  .ch-masthead-inner { padding: 18px 32px; }
  .ch-title {
    font-size: clamp(22px, 4.6vw, 34px);
    font-weight: 900;
    line-height: 1.15;
    letter-spacing: -0.02em;
    margin: 0;
    max-width: 22ch;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  /* ── Page grid ── */
  .ch-page {
    padding: 24px 32px 40px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 400px;
    gap: 32px;
    align-items: start;
  }
  .ch-main {
    display: flex;
    flex-direction: column;
    gap: 28px;
    min-width: 0;
  }
  .ch-main > section { width: 100%; }
  .ch-aside { display: flex; flex-direction: column; gap: 28px; min-width: 0; }

  /* ── Section ── */
  .ch-section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin: 0 0 10px;
  }
  .ch-section-title { font-size: 15px; font-weight: 800; margin: 0; letter-spacing: -0.01em; }
  .ch-section-hint { font-size: 12px; color: #9ca3af; font-weight: 500; margin: 2px 0 0; }
  .ch-link {
    font-family: ${FONT};
    font-size: 12px;
    font-weight: 700;
    color: ${MAROON};
    background: none;
    border: none;
    padding: 2px 0;
    cursor: pointer;
    white-space: nowrap;
  }
  .ch-link:hover { text-decoration: underline; }

  /* ── Action list ── */
  .ch-actions {
    list-style: none;
    margin: 0;
    padding: 0;
    background: #fff;
    border: 1px solid #e9eaeb;
    border-radius: 14px;
    overflow: hidden;
  }
  .ch-actions li + li { border-top: 1px solid #f0f0f0; }
  .ch-action {
    width: 100%;
    border: 0;
    background: #fff;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    color: inherit;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    transition: background .12s;
  }
  .ch-action:hover { background: #fafafa; }
  .ch-action-icon {
    width: 38px; height: 38px;
    border-radius: 10px;
    background: ${MAROON_LIGHT};
    color: ${MAROON};
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .ch-action-body { flex: 1; min-width: 0; }
  .ch-action-label { display: block; font-size: 14px; font-weight: 800; line-height: 1.3; }
  .ch-action-desc { display: block; font-size: 12.5px; font-weight: 500; color: #6b7280; line-height: 1.45; margin-top: 2px; }
  .ch-action-meta {
    font-size: 11.5px;
    font-weight: 700;
    color: ${MAROON};
    background: ${MAROON_LIGHT};
    padding: 3px 9px;
    border-radius: 20px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .ch-action-go { color: #d1d5db; flex-shrink: 0; transition: color .12s, transform .12s; }
  .ch-action:hover .ch-action-go { color: ${MAROON}; transform: translateX(2px); }

  .ch-action.primary { background: ${MAROON}; color: #fff; }
  .ch-action.primary:hover { background: #6a0e10; }
  .ch-action.primary .ch-action-icon { background: rgba(255,255,255,.16); color: #fff; }
  .ch-action.primary .ch-action-desc { color: rgba(255,255,255,.78); }
  .ch-action.primary .ch-action-meta { background: rgba(255,255,255,.16); color: #fff; }
  .ch-action.primary .ch-action-go { color: rgba(255,255,255,.7); }
  .ch-action.primary:hover .ch-action-go { color: #fff; }

  /* ── Panel (aside) ── */
  .ch-panel {
    background: #fff;
    border: 1px solid #e9eaeb;
    border-radius: 14px;
    padding: 16px;
  }

  /* ── Feed (timeline) ── */
  .ch-feed { list-style: none; margin: 0; padding: 0; position: relative; }
  .ch-feed::before {
    content: "";
    position: absolute;
    left: 13px; top: 14px; bottom: 14px;
    width: 2px;
    background: #f0f0f0;
  }
  .ch-feed-item { position: relative; display: flex; gap: 12px; padding: 8px 0; }
  .ch-feed-item > :first-child { position: relative; z-index: 1; }
  .ch-feed-text { font-size: 12.5px; color: #374151; line-height: 1.5; margin: 0; }
  .ch-feed-user { font-weight: 700; color: #111827; }
  .ch-feed-time { font-size: 11px; color: #9ca3af; margin: 2px 0 0; }

  /* ── States ── */
  .ch-empty { font-size: 12.5px; color: #9ca3af; margin: 0; padding: 6px 0; }
  .ch-skel { display: flex; flex-direction: column; gap: 14px; padding: 6px 0; }
  .ch-skel-row { display: flex; align-items: center; gap: 12px; }
  .ch-skel-dot, .ch-skel-line { background: #f1f1f0; animation: ch-pulse 1.4s ease-in-out infinite; }
  .ch-skel-dot { width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; }
  .ch-skel-line { height: 10px; border-radius: 6px; flex: 1; }
  @keyframes ch-pulse { 50% { opacity: .45; } }

  /* ══════════════════════════════════════
     ACTIVITY DRAWER
  ══════════════════════════════════════ */
  .act-overlay {
    position: fixed; inset: 0; z-index: 1000;
    display: flex; align-items: stretch; justify-content: flex-end;
    background: rgba(0,0,0,.45);
    backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
    font-family: ${FONT};
    animation: act-fadein .18s ease;
  }
  @keyframes act-fadein { from { opacity: 0; } to { opacity: 1; } }

  .act-drawer {
    width: 460px; max-width: 100vw;
    height: 100dvh; background: #fff;
    display: flex; flex-direction: column;
    box-shadow: -4px 0 40px rgba(0,0,0,.12);
    animation: act-slidein .22s cubic-bezier(.25,.46,.45,.94);
  }
  @keyframes act-slidein { from { transform: translateX(100%); } to { transform: translateX(0); } }

  .act-head {
    background: ${MAROON}; padding: 16px 18px;
    display: flex; align-items: center; gap: 10px; flex-shrink: 0;
  }
  .act-head-title { font-size: 15px; font-weight: 800; color: #fff; margin: 0; flex: 1; min-width: 0; }
  .act-head-count { font-size: 12px; font-weight: 500; color: rgba(255,255,255,.65); margin-left: 8px; }
  .act-close {
    width: 32px; height: 32px; border-radius: 8px;
    background: rgba(255,255,255,.15); border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    transition: background .12s;
  }
  .act-close:hover { background: rgba(255,255,255,.28); }

  .act-toolbar {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 16px; border-bottom: 1px solid #f0f0f0;
    background: #fafafa; flex-shrink: 0; flex-wrap: wrap;
  }
  .act-toolbar-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
  .act-cb-row { display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; }
  .act-cb {
    width: 17px; height: 17px; border: 2px solid #d1d5db; border-radius: 4px; background: #fff;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .12s;
  }
  .act-cb.on, .act-cb.mid { background: ${MAROON}; border-color: ${MAROON}; }
  .act-cb-label { font-size: 12px; font-weight: 700; color: #374151; }
  .act-sel-count { font-size: 11.5px; font-weight: 600; color: #9ca3af; white-space: nowrap; }

  .act-btn-clear {
    font-family: ${FONT}; font-size: 12px; font-weight: 800; color: #fff;
    background: ${MAROON}; border: none; border-radius: 7px;
    padding: 6px 12px; cursor: pointer;
    display: flex; align-items: center; gap: 5px;
    transition: opacity .12s; white-space: nowrap;
  }
  .act-btn-clear:hover { opacity: .85; }
  .act-btn-clear:disabled { opacity: .38; cursor: default; }
  .act-btn-clearall {
    font-family: ${FONT}; font-size: 12px; font-weight: 700; color: #6b7280;
    background: none; border: 1px solid #e5e7eb; border-radius: 7px;
    padding: 6px 10px; cursor: pointer; transition: all .12s; white-space: nowrap;
  }
  .act-btn-clearall:hover { border-color: ${MAROON}; color: ${MAROON}; }

  .act-list { flex: 1; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
  .act-item {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 11px 16px; border-bottom: 1px solid #f9fafb;
    cursor: pointer; transition: background .1s;
  }
  .act-item:hover { background: #fafafa; }
  .act-item.sel { background: ${MAROON_LIGHT}; }
  .act-item-cb {
    width: 17px; height: 17px; border: 2px solid #d1d5db; border-radius: 4px; background: #fff;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 6px;
    transition: all .12s;
  }
  .act-item.sel .act-item-cb { background: ${MAROON}; border-color: ${MAROON}; }
  .act-item-text { font-size: 12.5px; color: #374151; margin: 0; line-height: 1.55; }
  .act-item-time { font-size: 11px; color: #9ca3af; margin: 3px 0 0; }

  .act-blank {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 10px; padding: 48px 24px; text-align: center;
  }
  .act-blank-icon {
    width: 52px; height: 52px; border-radius: 50%; background: #f3f4f6;
    display: flex; align-items: center; justify-content: center;
  }
  .act-blank-text { font-size: 13px; font-weight: 600; color: #9ca3af; margin: 0; }

  /* ══════════════════════════════════════
     RESPONSIVE
  ══════════════════════════════════════ */
  @media (max-width: 960px) {
    .ch-page { grid-template-columns: minmax(0, 1fr); gap: 28px; padding: 20px 16px 40px; }
    .ch-masthead-inner { padding: 22px 16px 18px; }
  }
  @media (max-width: 520px) {
    .ch-action { padding: 12px; gap: 12px; }
    .ch-action-go { display: none; }
    .ch-action-meta { display: none; }
  }
  @media (max-width: 600px) {
    .act-overlay { align-items: flex-end; justify-content: center; }
    .act-drawer {
      width: 100%; height: 90dvh; border-radius: 20px 20px 0 0;
      box-shadow: 0 -6px 40px rgba(0,0,0,.16);
      animation: act-slideup .22s cubic-bezier(.25,.46,.45,.94);
    }
    @keyframes act-slideup { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .act-btn-clearall { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .act-overlay, .act-drawer, .ch-skel-dot, .ch-skel-line { animation: none; }
    .ch-action, .ch-action-go { transition: none; }
  }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
function relativeTime(iso: string | Date): string {
  const diff = Date.now() - new Date(iso).getTime();
  const plural = (n: number, u: string) => `${n} ${u}${n === 1 ? "" : "s"} ago`;
  if (diff < 60000)     return "Just now";
  if (diff < 3600000)   return plural(Math.floor(diff / 60000), "minute");
  if (diff < 86400000)  return plural(Math.floor(diff / 3600000), "hour");
  if (diff < 604800000) return plural(Math.floor(diff / 86400000), "day");
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const roleLabel = (r: string) => (r ? r.charAt(0).toUpperCase() + r.slice(1).toLowerCase() : "");

/* Fallback feed for users who can't call the admin activity endpoint */
function buildFallbackActivity(
  announcements: Announcement[],
  assignments: Assignment[],
  forms: FormItem[],
  people: PersonItem[],
): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const a of announcements) {
    const ts = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    items.push({
      id: `ann-${a.id}`,
      type: "announcement",
      text: `posted announcement: "${a.title}"`,
      user: a.authorName ?? undefined,
      time: ts ? relativeTime(new Date(ts)) : "Recently",
      ts,
    });
  }

  for (const a of assignments) {
    items.push({
      id: `asgn-${a.id}`,
      type: "assignment",
      text: `${a._isAssignedToYou ? "Assignment assigned to you" : "Assignment"}: "${a.title}"${a.dueDate ? ` — due ${fmtDue(a.dueDate)}` : ""}`,
      time: a.dueDate ? relativeTime(new Date(a.dueDate)) : "Recently",
      ts: a.dueDate ? new Date(a.dueDate).getTime() : 0,
    });
  }

  for (const f of forms) {
    items.push({
      id: `form-${f.id}`,
      type: "form",
      text: `${f.isCreator ? "You created form" : "Form assigned to you"}: "${f.title}"${f.dueDate ? ` — due ${fmtDue(f.dueDate)}` : ""}`,
      time: "Recently",
      ts: 0,
    });
  }

  for (const p of people.slice(0, 10)) {
    items.push({
      id: `enroll-${p.id}`,
      type: "enrollment",
      text: `joined the office as ${roleLabel(p.role)}`,
      user: p.name,
      time: "Recently",
      ts: 0,
    });
  }

  return items.sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0)).slice(0, 100);
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

  const allSelected = activity.length > 0 && selected.size === activity.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected || someSelected) setSelected(new Set());
    else setSelected(new Set(activity.map((a) => a.id)));
  }
  function toggleItem(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function handleClearSelected() {
    if (selected.size === 0) return;
    onClearItems(Array.from(selected));
    setSelected(new Set());
  }
  function handleClearAll() {
    onClearItems(activity.map((a) => a.id));
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
    <div className="act-overlay" onClick={onBackdropClick} role="dialog" aria-modal="true" aria-label="All activity">
      <div className="act-drawer">
        <div className="act-head">
          <p className="act-head-title">
            All activity
            {activity.length > 0 && (
              <span className="act-head-count">
                {activity.length} item{activity.length !== 1 ? "s" : ""}
              </span>
            )}
          </p>
          <button className="act-close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth={2.2} viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {activity.length > 0 && (
          <div className="act-toolbar">
            <div className="act-toolbar-left">
              <div
                className="act-cb-row"
                onClick={toggleAll}
                role="checkbox"
                aria-checked={allSelected ? "true" : someSelected ? "mixed" : "false"}
                tabIndex={0}
                onKeyDown={(e) => e.key === " " && (e.preventDefault(), toggleAll())}
              >
                <div className={`act-cb ${allSelected ? "on" : someSelected ? "mid" : ""}`}>
                  {allSelected && (
                    <svg width="9" height="9" fill="none" stroke="#fff" strokeWidth={2.5} viewBox="0 0 12 12">
                      <polyline points="1.5,6 4.5,9 10.5,3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {someSelected && (
                    <svg width="8" height="2" fill="none" stroke="#fff" strokeWidth={2.5} viewBox="0 0 8 2">
                      <line x1="0" y1="1" x2="8" y2="1" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
                <span className="act-cb-label">Select all</span>
              </div>
              {selected.size > 0 && <span className="act-sel-count">{selected.size} selected</span>}
            </div>
            <button className="act-btn-clear" onClick={handleClearSelected} disabled={selected.size === 0}>
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6" strokeLinecap="round" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" />
              </svg>
              {selected.size > 0 ? `Clear (${selected.size})` : "Clear"}
            </button>
            <button className="act-btn-clearall" onClick={handleClearAll}>Clear all</button>
          </div>
        )}

        {activity.length === 0 ? (
          <div className="act-blank">
            <div className="act-blank-icon">
              <Icon name="info" size={22} stroke="#9ca3af" />
            </div>
            <p className="act-blank-text">No activity to show.</p>
          </div>
        ) : (
          <div className="act-list" role="list">
            {activity.map((item) => {
              const isSel = selected.has(item.id);
              return (
                <div key={item.id} className={`act-item${isSel ? " sel" : ""}`} onClick={() => toggleItem(item.id)} role="listitem">
                  <div className="act-item-cb">
                    {isSel && (
                      <svg width="9" height="9" fill="none" stroke="#fff" strokeWidth={2.5} viewBox="0 0 12 12">
                        <polyline points="1.5,6 4.5,9 10.5,3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <ActivityDot type={item.type} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="act-item-text">
                      {item.user && <span style={{ fontWeight: 700, color: "#111827" }}>{item.user} </span>}
                      {item.text}
                    </p>
                    <p className="act-item-time">{item.time}</p>
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
   MAIN EXPORT
───────────────────────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
   OFFICE-SPECIFIC QUICK ACTIONS (mirrors the sidebar tabs of each office)
───────────────────────────────────────────────────────────────────────────── */
function getOfficeActions(
  officeType: string | null | undefined,
  canManage: boolean,
): { title: string; hint: string; list: QuickAction[] } | null {
  const t = (officeType ?? "").toUpperCase();
  const list: QuickAction[] = [];
  const add = (key: string, label: string, desc: string, tab: string, icon: keyof typeof ICONS) =>
    list.push({ key, label, desc, tab, icon: <Icon name={icon} size={18} /> });

  if (t === "CLINIC") {
    add("c-patient", "Patient Records", "Log clinic visits, vitals, and the action taken.", "Patient Records", "medical");
    add("c-exam", "Medical Exam Record", "Record medical exams and fitness clearances.", "Medical Exam Record", "exam");
    add("c-meds", "Medicine Inventory", "Check stock levels and track medicines given.", "Medicine Inventory", "pill");
    add("c-cases", "Medical Cases Summary", "See case counts by body system and condition.", "Medical Cases Summary", "chart");
    return { title: "Clinic", hint: "Patient care, exams, and medicine stock.", list };
  }

  if (t === "GUIDANCE") {
    add("g-sheet", "Information Sheets", "Student information sheets submitted to the office.", "Information Sheets", "log");
    add("g-log", "Log Sheet", "Record counseling and walk-in visits.", "Log Sheet", "exam");
    add("g-exit", "Exit Interviews", "Review and conduct graduating student interviews.", "Exit Interviews", "users");
    return { title: "Guidance", hint: "Student records, visits, and interviews.", list };
  }

  if (t === "LIBRARY") {
    add("l-cards", "Library Cards", "Process new, lost, and renewal card requests.", "Library Cards", "card");
    add("l-log", "Library Log", "View the card receiving and release log.", "Library Log", "log");
    add("l-catalog", "Book Catalog", "Add, edit, and track book copies.", "Book Catalog", "box");
    add("l-borrow", "Borrowing", "Lend books and monitor due dates and returns.", "Borrowing", "book");
    add("l-facility", "Facility Reservation", "Book the discussion or audio-visual room.", "Facility Reservation", "calendar");
    return { title: "Library", hint: "Cards, books, borrowing, and facilities.", list };
  }

  if (t === "OSA") {
    add("o-dir", "Student Directory", "Look up student records and standing.", "Student Directory", "users");
    add("o-log", "Disciplinary Log", "File and track student violation cases.", "Disciplinary Log", "alert");
    if (canManage) {
      add("o-types", "Violation Types", "Maintain violation codes, severity, and sanctions.", "Violation Types", "log");
    }
    add("o-lost", "Lost & Found", "Log found items and record who claimed them.", "Lost & Found", "search");
    return { title: "Student Affairs", hint: "Discipline records, directory, and lost items.", list };
  }

  return null;
}

const ACTIVITY_PREVIEW = 5;

export default function CourseHomeTab({
  course, membership, groups, courseId,
  canManageAnnouncements, canManageAssignments, canManagePeople, canManageCourse,
  isHead, currentUserId, onTabChange,
}: Props) {
  void membership;
  void groups;
  void isHead;
  void currentUserId;

  const [stats, setStats] = useState<Stats>({ people: 0, announcements: 0, assignments: 0, forms: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;

    (async () => {
      // 1) Same source as the admin home page
      try {
        const r = await fetch(`/api/admin/courses/${courseId}/activity`);
        if (r.ok) {
          const d = await r.json();
          if (cancelled) return;
          setActivity(d.activity ?? []);
          setStats({
            people: d.stats?.people ?? 0,
            announcements: d.stats?.announcements ?? 0,
            assignments: d.stats?.assignments ?? 0,
            forms: d.stats?.forms ?? 0,
          });
          return;
        }
      } catch {
        /* fall through to fallback */
      }

      // 2) Fallback for staff / faculty
      try {
        const base = `/api/courses/${courseId}`;
        const [aData, anData, pData, fData] = await Promise.all([
          fetch(`${base}/assignments`).then((r) => r.json()).catch(() => ({})),
          fetch(`${base}/announcements`).then((r) => r.json()).catch(() => ({})),
          fetch(`${base}/people`).then((r) => r.json()).catch(() => ({})),
          fetch(`${base}/forms`).then((r) => r.json()).catch(() => ({})),
        ]);
        if (cancelled) return;

        const assignments: Assignment[] = aData.assignments ?? [];
        const rawAnn = anData.announcements ?? anData.items ?? anData.data ?? [];
        const announcements: Announcement[] = rawAnn.map((item: RawAnnouncement, i: number) => normalizeAnnouncement(item, i));
        const people: PersonItem[] = pData.people ?? [];
        const forms: FormItem[] = fData.forms ?? [];

        setActivity(buildFallbackActivity(announcements, assignments, forms, people));
        setStats({
          people: people.length,
          announcements: announcements.length,
          assignments: assignments.length,
          forms: forms.length,
        });
      } catch {
        /* leave empty */
      }
    })().finally(() => {
      if (!cancelled) setLoadingActivity(false);
    });

    return () => { cancelled = true; };
  }, [courseId]);

  const handleClearItems = useCallback((ids: string[]) => {
    setActivity((prev) => prev.filter((a) => !ids.includes(a.id)));
  }, []);

  /* ── Quick actions (permission-based) ── */
  const createActions: QuickAction[] = [];
  if (canManageAnnouncements) {
    createActions.push({
      key: "announce",
      label: "New announcement",
      desc: "Post news or a reminder to everyone in this office.",
      meta: stats.announcements ? `${stats.announcements} posted` : undefined,
      tab: "Announcements",
      icon: <Icon name="announce" size={18} />,
    });
  }
  if (canManageAssignments) {
    createActions.push({
      key: "assignment",
      label: "New assignment",
      desc: "Create a task with a deadline and points.",
      meta: stats.assignments ? `${stats.assignments} total` : undefined,
      tab: "Assignments",
      icon: <Icon name="assignment" size={18} />,
    });
    createActions.push({
      key: "form",
      label: "New form",
      desc: "Build a survey, quiz, or registration form.",
      meta: stats.forms ? `${stats.forms} total` : undefined,
      tab: "Form",
      icon: <Icon name="form" size={18} />,
    });
  }

  const manageActions: QuickAction[] = [];
  if (canManagePeople) {
    manageActions.push({
      key: "person",
      label: "Add people",
      desc: "Add Head, Staff, or Faculty members to this office.",
      meta: stats.people ? `${stats.people} members` : undefined,
      tab: "Users",
      icon: <Icon name="person" size={18} />,
    });
  }
  if (canManageAssignments) {
    manageActions.push({
      key: "grade",
      label: "Grade submissions",
      desc: "Review what was handed in and give grades.",
      tab: "Grades",
      icon: <Icon name="grade" size={18} />,
    });
  }
  if (canManageCourse) {
    manageActions.push({
      key: "settings",
      label: "Office settings",
      desc: "Change the office name, dates, and access.",
      tab: "Settings",
      icon: <Icon name="settings" size={18} />,
    });
  }

  const office = getOfficeActions(course.officeType, canManageAnnouncements);

  const previewActivity = activity.slice(0, ACTIVITY_PREVIEW);

  const renderActions = (list: QuickAction[]) => (
    <ul className="ch-actions">
      {list.map((a) => (
        <li key={a.key}>
          <button type="button" className={`ch-action${a.primary ? " primary" : ""}`} onClick={() => onTabChange(a.tab)}>
            <span className="ch-action-icon">{a.icon}</span>
            <span className="ch-action-body">
              <span className="ch-action-label">{a.label}</span>
              <span className="ch-action-desc">{a.desc}</span>
            </span>
            {a.meta && <span className="ch-action-meta">{a.meta}</span>}
            <svg className="ch-action-go" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <style>{buildCss()}</style>
      <div className="ch-root">
        {/* ── Masthead ── */}
        <header className="ch-masthead">
          <div className="ch-masthead-inner">
            <h1 className="ch-title">{course.name}</h1>
          </div>
        </header>

        <div className="ch-page">
          {/* ── Main: quick actions ── */}
          <main className="ch-main">
            {office && office.list.length > 0 && (
              <section aria-labelledby="ch-office">
                <div className="ch-section-head">
                  <div>
                    <h2 className="ch-section-title" id="ch-office">{office.title}</h2>
                    <p className="ch-section-hint">{office.hint}</p>
                  </div>
                </div>
                {renderActions(office.list)}
              </section>
            )}
            {createActions.length > 0 && (
              <section aria-labelledby="ch-create">
                <div className="ch-section-head">
                  <div>
                    <h2 className="ch-section-title" id="ch-create">Create</h2>
                    <p className="ch-section-hint">Add new content to this office.</p>
                  </div>
                </div>
                {renderActions(createActions)}
              </section>
            )}

            {manageActions.length > 0 && (
              <section aria-labelledby="ch-manage">
                <div className="ch-section-head">
                  <div>
                    <h2 className="ch-section-title" id="ch-manage">Manage</h2>
                    <p className="ch-section-hint">Add people, review work, and adjust the office.</p>
                  </div>
                </div>
                {renderActions(manageActions)}
              </section>
            )}
          </main>

          {/* ── Aside: activity ── */}
          <aside className="ch-aside">
            <section aria-labelledby="ch-activity">
              <div className="ch-section-head">
                <div>
                  <h2 className="ch-section-title" id="ch-activity">Recent activity</h2>
                  <p className="ch-section-hint">Latest joins, posts, and submissions in this office.</p>
                </div>
                {!loadingActivity && (
                  <button className="ch-link" onClick={() => setShowDrawer(true)}>
                    View all{activity.length > 0 ? ` (${activity.length})` : ""}
                  </button>
                )}
              </div>
              <div className="ch-panel">
                {loadingActivity ? (
                  <div className="ch-skel" aria-busy="true">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="ch-skel-row">
                        <div className="ch-skel-dot" />
                        <div className="ch-skel-line" />
                      </div>
                    ))}
                  </div>
                ) : activity.length === 0 ? (
                  <p className="ch-empty">Nothing yet. New submissions, posts, and new members will show up here.</p>
                ) : (
                  <ul className="ch-feed">
                    {previewActivity.map((item) => (
                      <li key={item.id} className="ch-feed-item">
                        <ActivityDot type={item.type} size={28} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="ch-feed-text">
                            {item.user && <span className="ch-feed-user">{item.user} </span>}
                            {item.text}
                          </p>
                          <p className="ch-feed-time">{item.time}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {showDrawer && (
        <ActivityDrawer
          activity={activity}
          onClose={() => setShowDrawer(false)}
          onClearItems={handleClearItems}
        />
      )}
    </>
  );
}