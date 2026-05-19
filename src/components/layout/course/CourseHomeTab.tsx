"use client";

// src/components/layout/course/CourseHomeTab.tsx

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MAROON, FONT,
  fmtDate, fmtDue, normalizeAnnouncement,
} from "./helpers";
import type {
  Course, Membership, Group,
  Assignment as BaseAssignment, Announcement, RawAnnouncement,
} from "./types";

type Assignment = BaseAssignment & { createdById?: string; status?: string };

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
  type: "submission" | "announcement" | "enrollment" | "grade" | "general";
  text: string;
  user?: string;
  time: string;
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

/* ─────────────────────────────────────────────────────────────────────────────
   CSS
───────────────────────────────────────────────────────────────────────────── */
const CSS = `
  .ch-root *, .ch-root *::before, .ch-root *::after { box-sizing: border-box; }
  .ch-root {
    font-family: 'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;
    color: #111827;
    background: #f1f1f0;
    min-height: 100%;
  }

  @keyframes ch-fade {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: none; }
  }
  .ch-fade { animation: ch-fade .3s ease both; }

  /* ── Header ── */
  .ch-header {
    background: ${MAROON};
    padding: 0 16px;
    display: flex;
    align-items: flex-end;
    min-height: 100px;
  }
  @media (min-width: 640px) {
    .ch-header { padding: 0 24px; min-height: 110px; }
  }
  .ch-header-content {
    padding: 20px 0 0;
    flex: 1;
    min-width: 0;
  }
  .ch-header-eyebrow {
    font-size: 10px;
    font-weight: 800;
    color: rgba(255,255,255,.45);
    text-transform: uppercase;
    letter-spacing: .22em;
    margin: 0 0 5px;
  }
  .ch-course-name {
    font-size: clamp(15px, 4vw, 22px);
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
  .ch-course-meta { font-size: 11px; color: rgba(255,255,255,.5); font-weight: 500; margin-top: 3px; }

  /* ── View switcher tabs ── */
  .ch-view-tabs {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    margin-top: 14px;
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

  /* ── Stat strip ── */
  .ch-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    background: #fff;
    border-bottom: 1px solid #e5e7eb;
  }
  @media (min-width: 640px) {
    .ch-stats { grid-template-columns: repeat(4, 1fr); }
  }
  .ch-stat {
    padding: 12px 14px;
    border-right: 1px solid #f0f0f0;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: background .12s;
    min-width: 0;
  }
  .ch-stat:last-child { border-right: none; }
  .ch-stat:nth-child(2) { border-right: none; }
  @media (min-width: 640px) {
    .ch-stat:nth-child(2) { border-right: 1px solid #f0f0f0; }
    .ch-stat:last-child { border-right: none; }
  }
  .ch-stat:nth-child(1), .ch-stat:nth-child(2) { border-bottom: 1px solid #f0f0f0; }
  @media (min-width: 640px) {
    .ch-stat:nth-child(1), .ch-stat:nth-child(2) { border-bottom: none; }
  }
  .ch-stat:hover { background: #fafafa; }
  .ch-stat-icon {
    width: 32px; height: 32px;
    border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  @media (min-width: 640px) { .ch-stat-icon { width: 34px; height: 34px; } }
  .ch-stat-val { font-size: clamp(16px,3vw,20px); font-weight: 900; line-height: 1; }
  .ch-stat-lbl { font-size: 10px; font-weight: 600; color: #9ca3af; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* ── Body ── */
  .ch-body {
    padding: 14px 12px 28px;
  }
  @media (min-width: 640px) { .ch-body { padding: 18px 20px 32px; } }

  /* ── Two-col layout ── */
  .ch-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }
  @media (min-width: 900px) {
    .ch-layout { grid-template-columns: 1fr 300px; align-items: start; }
  }
  .ch-main { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
  .ch-side  { display: flex; flex-direction: column; gap: 12px; min-width: 0; }

  /* ── Card ── */
  .ch-card { background: #fff; border-radius: 12px; border: 1px solid #e9eaeb; overflow: hidden; }
  .ch-card-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 13px 16px 0; gap: 8px;
  }
  .ch-card-title {
    font-size: 11px; font-weight: 800; color: #111827;
    text-transform: uppercase; letter-spacing: .1em; margin: 0;
    display: flex; align-items: center; gap: 6px;
  }
  .ch-card-action {
    font-size: 11px; font-weight: 700; color: ${MAROON};
    background: none; border: none; cursor: pointer;
    padding: 0; white-space: nowrap; flex-shrink: 0;
    font-family: 'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;
  }
  .ch-card-action:hover { text-decoration: underline; }
  .ch-card-body { padding: 12px 16px 14px; }

  /* ── Quick actions grid ── */
  .ch-actions-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 8px; padding: 12px 16px 14px;
  }
  @media (max-width: 360px) { .ch-actions-grid { grid-template-columns: 1fr; } }

  .ch-action-btn {
    display: flex; align-items: center; gap: 9px;
    padding: 10px 12px; border-radius: 10px;
    border: 1px solid #e9eaeb; background: #fafafa;
    cursor: pointer; font-family: 'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;
    text-align: left; transition: all .14s; width: 100%; min-height: 50px;
  }
  .ch-action-btn:hover {
    border-color: ${MAROON}; background: #fdf2f2;
    transform: translateY(-1px); box-shadow: 0 2px 8px rgba(123,17,19,.08);
  }
  .ch-action-btn:active { transform: translateY(0); }
  .ch-action-icon {
    width: 30px; height: 30px; border-radius: 8px;
    background: #fdf2f2; display: flex; align-items: center;
    justify-content: center; flex-shrink: 0; color: ${MAROON};
  }
  .ch-action-label { font-size: 11px; font-weight: 700; color: #374151; line-height: 1.3; }

  /* ── Activity rows ── */
  .ch-activity-row {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 9px 0; border-bottom: 1px solid #f9fafb;
  }
  .ch-activity-row:last-child { border-bottom: none; }

  /* ── Enrollment rows ── */
  .ch-enroll-row {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 0; border-bottom: 1px solid #f9fafb;
  }
  .ch-enroll-row:last-child { border-bottom: none; }

  /* ── Row items (staff view) ── */
  .ch-row {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 14px; border-bottom: 1px solid #f9fafb; transition: background .1s;
  }
  .ch-row:last-child { border-bottom: none; }
  .ch-row.clickable { cursor: pointer; }
  .ch-row.clickable:hover { background: #fafafa; }
  .ch-row-icon {
    width: 30px; height: 30px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .ch-row-title {
    font-size: 12px; font-weight: 600; color: #111827;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  @media (min-width: 640px) { .ch-row-title { font-size: 13px; } }
  .ch-row-sub { font-size: 10px; color: #9ca3af; margin-top: 1px; }
  .ch-row-right { margin-left: auto; text-align: right; flex-shrink: 0; }
  .ch-row-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

  /* ── Badge ── */
  .ch-badge {
    font-size: 9px; font-weight: 700; padding: 2px 7px;
    border-radius: 20px; display: inline-block; white-space: nowrap;
  }

  /* ── Progress bar ── */
  .ch-bar-track { height: 5px; background: #f3f4f6; border-radius: 99px; overflow: hidden; }
  .ch-bar-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg,#7b1113,#b91c1c); transition: width .5s ease; }

  /* ── Spinner ── */
  .ch-spinner {
    width: 14px; height: 14px;
    border: 2px solid #f0e4e4; border-top: 2px solid ${MAROON};
    border-radius: 50%; animation: ch-spin .8s linear infinite; flex-shrink: 0;
  }
  @keyframes ch-spin { to { transform: rotate(360deg); } }

  /* ── Empty ── */
  .ch-empty {
    padding: 22px 16px; text-align: center; font-size: 12px; color: #9ca3af;
    display: flex; flex-direction: column; align-items: center; gap: 5px;
  }

  /* ── View more ── */
  .ch-view-more {
    width: 100%; margin-top: 10px;
    padding: 8px; background: #f9fafb;
    border: 1px solid #e9eaeb; border-radius: 8px;
    font-size: 11.5px; font-weight: 700; color: ${MAROON};
    cursor: pointer;
    font-family: 'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;
    transition: background .12s; display: flex;
    align-items: center; justify-content: center; gap: 5px;
  }
  .ch-view-more:hover { background: #fdf2f2; }

  /* ══════════════════════════════════════
     ACTIVITY DRAWER
  ══════════════════════════════════════ */
  .act-overlay {
    position: fixed; inset: 0; z-index: 1000;
    display: flex; align-items: stretch; justify-content: flex-end;
    background: rgba(0,0,0,.4);
    backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
    animation: act-fadein .18s ease;
  }
  @keyframes act-fadein { from { opacity: 0; } to { opacity: 1; } }

  .act-drawer {
    width: 480px; max-width: 100vw;
    height: 100dvh; background: #fff;
    display: flex; flex-direction: column;
    box-shadow: -4px 0 40px rgba(0,0,0,.13);
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
  .act-item.sel { background: #fef2f2; }

  .act-item-cb {
    width: 17px; height: 17px; border: 2px solid #d1d5db;
    border-radius: 4px; background: #fff;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-top: 9px; transition: all .12s;
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

  /* ── Mobile bottom sheet ── */
  @media (max-width: 600px) {
    .act-overlay { align-items: flex-end; justify-content: center; }
    .act-drawer {
      width: 100%; height: 90dvh;
      border-radius: 20px 20px 0 0;
      box-shadow: 0 -6px 40px rgba(0,0,0,.16);
      animation: act-slideup .22s cubic-bezier(.25,.46,.45,.94);
    }
    @keyframes act-slideup { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .act-head { border-radius: 20px 20px 0 0; }
    .act-btn-clearall { display: none; }
  }

  /* ── Responsive ── */
  @media (max-width: 480px) {
    .ch-actions-grid { gap: 6px; padding: 10px 12px 12px; }
    .ch-action-btn { padding: 9px 10px; gap: 8px; min-height: 48px; }
    .ch-action-label { font-size: 10.5px; }
    .ch-action-icon { width: 28px; height: 28px; }
  }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   SVG ICONS
───────────────────────────────────────────────────────────────────────────── */
const Icons = {
  Assignment:   () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="4" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" /></svg>,
  Announcement: () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round" /></svg>,
  People:       () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" /></svg>,
  Clock:        () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" strokeLinecap="round" /></svg>,
  Chart:        () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round" /><line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round" /><line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round" /></svg>,
};

/* ─────────────────────────────────────────────────────────────────────────────
   ACTIVITY ICON
───────────────────────────────────────────────────────────────────────────── */
type ActivityType = "submission" | "announcement" | "enrollment" | "grade" | "general";

function ActivityIcon({ type, large = false }: { type: ActivityType; large?: boolean }) {
  const size     = large ? 36 : 32;
  const iconSize = large ? 15 : 13;
  const cfg: Record<ActivityType, { bg: string; stroke: string; path: React.ReactNode }> = {
    submission:   { bg: "#eff6ff", stroke: "#3b82f6", path: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round"/><polyline points="17 8 12 3 7 8" strokeLinecap="round"/><line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round"/></> },
    announcement: { bg: "#fdf2f2", stroke: MAROON,    path: <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round"/> },
    enrollment:   { bg: "#f0fdf4", stroke: "#16a34a", path: <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14" strokeLinecap="round"/><line x1="23" y1="11" x2="17" y2="11" strokeLinecap="round"/></> },
    grade:        { bg: "#fefce8", stroke: "#ca8a04", path: <><path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round"/></> },
    general:      { bg: "#f9fafb", stroke: "#9ca3af", path: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/></> },
  };
  const c = cfg[type];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width={iconSize} height={iconSize} fill="none" stroke={c.stroke} strokeWidth={2} viewBox="0 0 24 24">{c.path}</svg>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SHARED HELPERS
───────────────────────────────────────────────────────────────────────────── */
function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="ch-empty">
      <div style={{ fontSize: 22 }}>{emoji}</div>
      <div>{text}</div>
    </div>
  );
}

function ProgressRow({ label, current, total, unit = "" }: { label: string; current: number; total: number; unit?: string }) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: MAROON }}>{current}{unit}/{total}{unit}</span>
      </div>
      <div className="ch-bar-track"><div className="ch-bar-fill" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STAT STRIP
───────────────────────────────────────────────────────────────────────────── */
interface StatItem { label: string; value: number | string; color: string; bg: string; icon: React.ReactNode; onClick?: () => void; }

function StatStrip({ items }: { items: StatItem[] }) {
  return (
    <div className="ch-stats">
      {items.map(s => (
        <div key={s.label} className="ch-stat" style={{ cursor: s.onClick ? "pointer" : "default" }} onClick={s.onClick}>
          <div className="ch-stat-icon" style={{ background: s.bg }}>
            <svg width="15" height="15" fill="none" stroke={s.color} strokeWidth={2} viewBox="0 0 24 24">{s.icon}</svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="ch-stat-val" style={{ color: s.color }}>{s.value}</div>
            <div className="ch-stat-lbl">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
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
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
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
    <div className="act-overlay" onClick={onBackdropClick} role="dialog" aria-modal="true" aria-label="All Activity">
      <div className="act-drawer">
        <div className="act-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
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
        </div>

        {activity.length > 0 && (
          <div className="act-toolbar">
            <div className="act-toolbar-left">
              <div
                className="act-cb-row" onClick={toggleAll}
                role="checkbox" aria-checked={allSelected ? "true" : someSelected ? "mixed" : "false"}
                tabIndex={0} onKeyDown={e => e.key === " " && (e.preventDefault(), toggleAll())}
              >
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
                  <ActivityIcon type={item.type} large />
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
   STAFF-VIEW CARDS
───────────────────────────────────────────────────────────────────────────── */
function AnnouncementsCard({ announcements, onTabChange }: { announcements: Announcement[]; onTabChange: (t: string) => void }) {
  const unread = announcements.filter(a => !a.read).length;
  return (
    <div className="ch-card">
      <div className="ch-card-header">
        <p className="ch-card-title">
          <Icons.Announcement /> Announcements
          {unread > 0 && <span className="ch-badge" style={{ background: MAROON, color: "#fff", fontSize: 9 }}>{unread} new</span>}
        </p>
        <button className="ch-card-action" onClick={() => onTabChange("Announcements")}>View all →</button>
      </div>
      {announcements.length === 0 ? (
        <EmptyState emoji="📭" text="No announcements yet" />
      ) : announcements.slice(0, 5).map(a => (
        <div key={a.id} className="ch-row clickable" onClick={() => onTabChange("Announcements")}>
          <div className="ch-row-dot" style={{ background: a.read ? "transparent" : MAROON, border: a.read ? "1.5px solid #e5e7eb" : "none" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ch-row-title" style={{ fontWeight: a.read ? 500 : 700 }}>{a.title}</div>
            <div className="ch-row-sub">{a.authorName} · {fmtDate(a.createdAt)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function UpcomingDueCard({ assignments, now, courseId, onTabChange, isHead }: {
  assignments: Assignment[]; now: Date; courseId: string;
  onTabChange: (t: string) => void; isHead: boolean;
}) {
  const router = useRouter();
  const upcoming = assignments
    .filter(a => a.dueDate && new Date(a.dueDate) >= now)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  return (
    <div className="ch-card">
      <div className="ch-card-header">
        <p className="ch-card-title"><Icons.Clock /> Upcoming Due Dates</p>
        <button className="ch-card-action" onClick={() => onTabChange("Assignments")}>View all →</button>
      </div>
      {upcoming.length === 0 ? (
        <EmptyState emoji="✅" text="No upcoming due dates" />
      ) : upcoming.map(a => {
        const daysLeft  = a.dueDate ? Math.ceil((new Date(a.dueDate).getTime() - now.getTime()) / 86400000) : null;
        const urgent    = daysLeft !== null && daysLeft <= 2;
        const submitted = !!(a.submissions ?? [])[0]?.submittedAt;
        return (
          <div key={a.id} className="ch-row clickable"
            onClick={() => isHead ? onTabChange("Assignments") : router.push(`/courses/${courseId}/assignments/${a.id}`)}>
            <div className="ch-row-icon" style={{ background: submitted ? "#f0fdf4" : urgent ? "#fef2f2" : "#f9fafb" }}>
              <span style={{ color: submitted ? "#15803d" : MAROON }}><Icons.Assignment /></span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ch-row-title">{a.title}</div>
              <div className="ch-row-sub">{a.assignmentGroup} · {a.points} pts</div>
            </div>
            <div className="ch-row-right">
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
  );
}

function MyProgressCard({ assignments, onTabChange }: { assignments: Assignment[]; onTabChange: (t: string) => void }) {
  const submitted = assignments.filter(a => (a.submissions ?? [])[0]?.submittedAt);
  const totalPts  = assignments.reduce((s, a) => s + (a.points || 0), 0);
  const earnedPts = assignments.reduce((s, a) => s + ((a.submissions ?? [])[0]?.grade ?? 0), 0);
  const graded    = assignments.filter(a => (a.submissions ?? [])[0]?.grade != null);
  return (
    <div className="ch-card">
      <div className="ch-card-header">
        <p className="ch-card-title"><Icons.Chart /> My Progress</p>
        <button className="ch-card-action" onClick={() => onTabChange("Grades")}>View grades →</button>
      </div>
      <div className="ch-card-body">
        <ProgressRow label="Submissions" current={submitted.length} total={assignments.length} />
        <ProgressRow label="Overall Grade" current={earnedPts} total={totalPts} unit=" pts" />
        {graded.length > 0 && (
          <>
            <p style={{ fontSize: 10, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".08em", margin: "10px 0 8px" }}>Recent Grades</p>
            {graded.slice(0, 3).map(a => {
              const grade = (a.submissions ?? [])[0]?.grade ?? 0;
              const pct   = a.points > 0 ? Math.round((grade / a.points) * 100) : 0;
              const col   = pct >= 75 ? "#15803d" : pct >= 50 ? "#b45309" : "#b91c1c";
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: "#fafafa", borderRadius: 8, border: "1px solid #f3f4f6", marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "58%" }}>{a.title}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: col }}>{grade}/{a.points}<span style={{ fontWeight: 500, color: "#9ca3af" }}> ({pct}%)</span></span>
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

function MyGroupsCard({ groups, courseId }: { groups: Group[]; courseId: string }) {
  const router   = useRouter();
  const myGroups = groups.filter(g => g.isMember);
  return (
    <div className="ch-card">
      <div className="ch-card-header"><p className="ch-card-title"><Icons.People /> My Groups</p></div>
      {myGroups.length === 0 ? (
        <EmptyState emoji="🔍" text="You are not in any group yet" />
      ) : myGroups.map(g => (
        <div key={g.id} className="ch-row clickable" onClick={() => router.push(`/courses/${courseId}/groups/${g.id}`)}>
          <div className="ch-row-icon" style={{ background: "#fef2f2" }}>
            <span style={{ color: MAROON }}><Icons.People /></span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ch-row-title">{g.name}</div>
            <div className="ch-row-sub">{g.memberCount} member{g.memberCount !== 1 ? "s" : ""} · {g.groupSetName}</div>
          </div>
          <span style={{ fontSize: 11, color: MAROON, fontWeight: 700, flexShrink: 0 }}>Visit →</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   QUICK ACTIONS CARD (reusable)
───────────────────────────────────────────────────────────────────────────── */
function QuickActionsCard({ actions }: { actions: { label: string; icon: React.ReactNode; onClick: () => void }[] }) {
  return (
    <div className="ch-card">
      <div className="ch-card-header" style={{ paddingBottom: 0 }}>
        <p className="ch-card-title">Quick Actions</p>
      </div>
      <div className="ch-actions-grid">
        {actions.map(a => (
          <button key={a.label} type="button" className="ch-action-btn" onClick={a.onClick}>
            <div className="ch-action-icon">
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                {a.icon}
              </svg>
            </div>
            <span className="ch-action-label">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
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

  const [headView, setHeadView]               = useState<"admin" | "staff">("admin");
  const [assignments, setAssignments]         = useState<Assignment[]>([]);
  const [announcements, setAnnouncements]     = useState<Announcement[]>([]);
  const [peopleCount, setPeopleCount]         = useState(0);
  const [stats, setStats]                     = useState<Stats>({ people: 0, announcements: 0, assignments: 0, forms: 0 });
  const [activity, setActivity]               = useState<ActivityItem[]>([]);
  const [enrollments, setEnrollments]         = useState<EnrollmentItem[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [showDrawer, setShowDrawer]           = useState(false);

  useEffect(() => {
    const base = `/api/courses/${courseId}`;
    Promise.all([
      fetch(`${base}/assignments`).then(r => r.json()).catch(() => ({ assignments: [] })),
      fetch(`${base}/announcements`).then(r => r.json()).catch(() => ({ announcements: [] })),
      fetch(`${base}/people`).then(r => r.json()).catch(() => ({ people: [] })),
    ]).then(([aData, anData, pData]) => {
      setAssignments(aData.assignments ?? []);
      const raw = anData.announcements ?? anData.items ?? anData.data ?? [];
      setAnnouncements(raw.map((item: RawAnnouncement, i: number) => normalizeAnnouncement(item, i)));
      setPeopleCount((pData.people ?? []).length);
      setLoading(false);
    });
  }, [courseId]);

  useEffect(() => {
    if (!isHead) return;
    fetch(`/api/admin/courses/${courseId}/activity`)
      .then(r => r.json())
      .then(d => {
        setActivity(d.activity ?? []);
        setStats(d.stats ?? { people: 0, announcements: 0, assignments: 0, forms: 0 });
      })
      .catch(() => {})
      .finally(() => setLoadingActivity(false));
    fetch(`/api/admin/courses/${courseId}/enrollments/recent`)
      .then(r => r.json())
      .then(d => setEnrollments(d.enrollments ?? []))
      .catch(() => {});
  }, [courseId, isHead]);

  const handleClearItems = useCallback((ids: string[]) => {
    setActivity(prev => prev.filter(a => !ids.includes(a.id)));
  }, []);

  const now = new Date();

  // Derived values used in both head staff view and non-head staff view
  const totalAssignments = assignments.length;
  const mySubmitted      = assignments.filter(a => (a.submissions ?? [])[0]?.submittedAt).length;
  const myTotalPts       = assignments.reduce((s, a) => s + (a.points || 0), 0);
  const myEarnedPts      = assignments.reduce((s, a) => s + ((a.submissions ?? [])[0]?.grade ?? 0), 0);
  const myGradePct       = myTotalPts > 0 ? Math.round((myEarnedPts / myTotalPts) * 100) : 0;
  const unreadCount      = announcements.filter(a => !a.read).length;
  const dueThisWeekAll   = assignments.filter(a =>
    a.dueDate && new Date(a.dueDate) > now && new Date(a.dueDate) <= new Date(now.getTime() + 7 * 86400000)
  ).length;

  const previewActivity = activity.slice(0, PREVIEW_COUNT);
  const extraCount      = activity.length - PREVIEW_COUNT;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 220, color: "#9ca3af", fontSize: 13, fontFamily: FONT, gap: 10 }}>
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 60" />
        </svg>
        Loading dashboard…
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════════
     HEAD VIEW
  ══════════════════════════════════════════════════════════════════════════ */
  if (isHead) {

    // ── Unit Management stats (Staff · Assignments · Forms · Announcements) ──
    const adminStats: StatItem[] = [
      {
        label: "Staff",
        value: stats.people || peopleCount,
        color: "#2563eb", bg: "#eff6ff",
        icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round"/></>,
        onClick: () => onTabChange("People"),
      },
      {
        label: "Assignments",
        value: stats.assignments || totalAssignments,
        color: MAROON, bg: "#fdf2f2",
        icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9" strokeLinecap="round"/><line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round"/></>,
        onClick: () => onTabChange("Assignments"),
      },
      {
        label: "Forms",
        value: stats.forms,
        color: "#0891b2", bg: "#ecfeff",
        icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10h8M8 14h5" strokeLinecap="round"/><circle cx="17" cy="14" r="2.5"/></>,
        onClick: () => onTabChange("Forms"),
      },
      {
        label: "Announcements",
        value: stats.announcements || announcements.length,
        color: "#7c3aed", bg: "#f5f3ff",
        icon: <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round"/>,
        onClick: () => onTabChange("Announcements"),
      },
    ];

    // ── Unit Management quick actions ──
    const adminActions = [
      ...(canManageAnnouncements ? [{
        label: "New Announcement",
        icon: <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round" strokeLinejoin="round"/>,
        onClick: () => onTabChange("Announcements"),
      }] : []),
      ...(canManageAssignments ? [{
        label: "New Assignment",
        icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9" strokeLinecap="round"/><line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round"/></>,
        onClick: () => onTabChange("Assignments"),
      }] : []),
      {
        label: "View Grades",
        icon: <><path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/></>,
        onClick: () => onTabChange("Grades"),
      },
      ...(canManagePeople ? [{
        label: "View People",
        icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round"/></>,
        onClick: () => onTabChange("People"),
      }] : []),
      {
        label: "View Forms",
        icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10h8M8 14h5" strokeLinecap="round"/><circle cx="17" cy="14" r="2.5"/></>,
        onClick: () => onTabChange("Forms"),
      },
    ];

    // ── My Dashboard stats ──
    const staffStats: StatItem[] = [
      {
        label: "Submitted",
        value: `${mySubmitted}/${totalAssignments}`,
        color: MAROON, bg: "#fdf2f2",
        icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9" strokeLinecap="round"/><line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round"/></>,
      },
      {
        label: "Current Grade",
        value: `${myGradePct}%`,
        color: "#0891b2", bg: "#ecfeff",
        icon: <><line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round"/><line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round"/><line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round"/></>,
      },
      {
        label: "Unread Announcements",
        value: unreadCount,
        color: unreadCount > 0 ? "#7c3aed" : "#6b7280",
        bg: unreadCount > 0 ? "#f5f3ff" : "#f9fafb",
        icon: <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round"/>,
      },
      {
        label: "Due This Week",
        value: dueThisWeekAll,
        color: dueThisWeekAll > 0 ? "#b91c1c" : "#6b7280",
        bg: dueThisWeekAll > 0 ? "#fef2f2" : "#f9fafb",
        icon: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" strokeLinecap="round"/></>,
      },
    ];

    // ── My Dashboard quick actions: Grades · Announcements · Assignments · Forms ──
    const myDashboardActions = [
      {
        label: "Grades",
        icon: <><path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/></>,
        onClick: () => onTabChange("Grades"),
      },
      {
        label: "Announcements",
        icon: <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round" strokeLinejoin="round"/>,
        onClick: () => onTabChange("Announcements"),
      },
      {
        label: "Assignments",
        icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9" strokeLinecap="round"/><line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round"/></>,
        onClick: () => onTabChange("Assignments"),
      },
      {
        label: "Forms",
        icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10h8M8 14h5" strokeLinecap="round"/><circle cx="17" cy="14" r="2.5"/></>,
        onClick: () => onTabChange("Forms"),
      },
    ];

    return (
      <>
        <style>{CSS}</style>
        <div className="ch-root ch-fade">

          {/* Header */}
          <div className="ch-header">
            <div className="ch-header-content">
              <p className="ch-header-eyebrow">Unit Overview</p>
              <h1 className="ch-course-name">{course.name}</h1>
              {(course.code || course.term) && (
                <p className="ch-course-meta">{course.code}{course.term ? ` · ${course.term}` : ""}</p>
              )}
              <div className="ch-view-tabs">
                <button className={`ch-view-tab ${headView === "admin" ? "active" : ""}`} onClick={() => setHeadView("admin")}>
                  Unit Management
                </button>
                <button className={`ch-view-tab ${headView === "staff" ? "active" : ""}`} onClick={() => setHeadView("staff")}>
                  My Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Stat strip */}
          <StatStrip items={headView === "admin" ? adminStats : staffStats} />

          {/* Body */}
          <div className="ch-body">

            {/* ── UNIT MANAGEMENT ── */}
            {headView === "admin" && (
              <div className="ch-layout">
                <div className="ch-main">
                  <QuickActionsCard actions={adminActions} />

                  {/* Recent Activity */}
                  <div className="ch-card">
                    <div className="ch-card-header">
                      <p className="ch-card-title">
                        Recent Activity
                        {activity.length > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "none", letterSpacing: 0 }}>
                            ({activity.length})
                          </span>
                        )}
                      </p>
                      {!loadingActivity && (
                        <button className="ch-card-action" onClick={() => setShowDrawer(true)}>View all →</button>
                      )}
                    </div>
                    <div className="ch-card-body">
                      {loadingActivity ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="ch-spinner" />
                          <span style={{ fontSize: 12, color: "#9ca3af" }}>Loading…</span>
                        </div>
                      ) : activity.length === 0 ? (
                        <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>No recent activity.</p>
                      ) : (
                        <>
                          {previewActivity.map(item => (
                            <div key={item.id} className="ch-activity-row">
                              <ActivityIcon type={item.type} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 12, color: "#374151", margin: 0, lineHeight: 1.5 }}>
                                  {item.user && <span style={{ fontWeight: 700, color: "#111827" }}>{item.user} </span>}
                                  {item.text}
                                </p>
                                <p style={{ fontSize: 10.5, color: "#9ca3af", margin: "2px 0 0" }}>{item.time}</p>
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
                </div>

                {/* Sidebar */}
                <div className="ch-side">
                  <div className="ch-card">
                    <div className="ch-card-header">
                      <p className="ch-card-title">Recent Enrollments</p>
                      <button className="ch-card-action" onClick={() => onTabChange("People")}>View all</button>
                    </div>
                    <div className="ch-card-body">
                      {enrollments.length === 0 ? (
                        <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>No recent enrollments.</p>
                      ) : enrollments.map(e => (
                        <div key={e.id} className="ch-enroll-row">
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f0e4e4", color: MAROON, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                            {e.name?.[0]?.toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</p>
                            <p style={{ fontSize: 10.5, color: "#9ca3af", margin: "1px 0 0" }}>{e.role} · {e.joinedAt}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── MY DASHBOARD ── */}
            {headView === "staff" && (
              <div className="ch-layout">
                <div className="ch-main">
                  <QuickActionsCard actions={myDashboardActions} />
                  <UpcomingDueCard assignments={assignments} now={now} courseId={courseId} onTabChange={onTabChange} isHead />
                  <AnnouncementsCard announcements={announcements} onTabChange={onTabChange} />
                </div>
                <div className="ch-side">
                  <MyProgressCard assignments={assignments} onTabChange={onTabChange} />
                  <MyGroupsCard groups={groups} courseId={courseId} />
                </div>
              </div>
            )}

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

  /* ══════════════════════════════════════════════════════════════════════════
     STAFF (non-head) VIEW
  ══════════════════════════════════════════════════════════════════════════ */
  const staffStats: StatItem[] = [
    {
      label: "Submitted",
      value: `${mySubmitted}/${totalAssignments}`,
      color: MAROON, bg: "#fdf2f2",
      icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9" strokeLinecap="round"/><line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round"/></>,
    },
    {
      label: "Current Grade",
      value: `${myGradePct}%`,
      color: "#0891b2", bg: "#ecfeff",
      icon: <><line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round"/><line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round"/><line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round"/></>,
    },
    {
      label: "Unread Announcements",
      value: unreadCount,
      color: unreadCount > 0 ? "#7c3aed" : "#6b7280",
      bg: unreadCount > 0 ? "#f5f3ff" : "#f9fafb",
      icon: <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round"/>,
    },
    {
      label: "Due This Week",
      value: dueThisWeekAll,
      color: dueThisWeekAll > 0 ? "#b91c1c" : "#6b7280",
      bg: dueThisWeekAll > 0 ? "#fef2f2" : "#f9fafb",
      icon: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" strokeLinecap="round"/></>,
    },
  ];

  const staffQuickActions = [
    {
      label: "View Grades",
      icon: <><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round"/></>,
      onClick: () => onTabChange("Grades"),
    },
    {
      label: "Announcements",
      icon: <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round" strokeLinejoin="round"/>,
      onClick: () => onTabChange("Announcements"),
    },
    {
      label: "Assignments",
      icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9" strokeLinecap="round"/><line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round"/></>,
      onClick: () => onTabChange("Assignments"),
    },
    {
      label: "Form",
      icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M12 13H8M16 17H8" strokeLinecap="round" /></>,
      onClick: () => onTabChange("Form"),
    },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="ch-root ch-fade">

        <div className="ch-header">
          <div className="ch-header-content">
            <p className="ch-header-eyebrow">Course Dashboard</p>
            <h1 className="ch-course-name">{course.name}</h1>
            {(course.code || course.term) && (
              <p className="ch-course-meta">{course.code}{course.term ? ` · ${course.term}` : ""}</p>
            )}
            <div className="ch-view-tabs">
              <button className="ch-view-tab active">My Dashboard</button>
            </div>
          </div>
        </div>

        <StatStrip items={staffStats} />

        <div className="ch-body">
          <div className="ch-layout">
            <div className="ch-main">
              <QuickActionsCard actions={staffQuickActions} />
              <UpcomingDueCard assignments={assignments} now={now} courseId={courseId} onTabChange={onTabChange} isHead={false} />
              <AnnouncementsCard announcements={announcements} onTabChange={onTabChange} />
            </div>
            <div className="ch-side">
              <MyProgressCard assignments={assignments} onTabChange={onTabChange} />
              <MyGroupsCard groups={groups} courseId={courseId} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}