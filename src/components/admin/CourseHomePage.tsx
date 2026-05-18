"use client";
// src/components/admin/CourseHomePage.tsx

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const MAROON = "#7b1113";
const FONT = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
interface Props {
  courseId: string;
  courseName: string;
}

interface ActivityItem {
  id: string;
  type: "submission" | "announcement" | "enrollment" | "grade" | "general";
  text: string;
  user?: string;
  time: string;
}

interface Stats {
  people: number;
  announcements: number;
  assignments: number;
  forms: number;
}

interface RecentEnrollment {
  id: string;
  name: string;
  image: string | null;
  role: string;
  joinedAt: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
function Avatar({ name, image, size = 30 }: { name: string; image: string | null; size?: number }) {
  if (image) {
    return (
      <Image
        src={image}
        alt={name}
        width={size}
        height={size}
        style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "#f0e4e4", color: MAROON,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 800, flexShrink: 0,
    }}>
      {name?.[0]?.toUpperCase()}
    </div>
  );
}

function ActivityIcon({ type }: { type: ActivityItem["type"] }) {
  const cfg = {
    submission:   { bg: "#eff6ff", stroke: "#3b82f6", path: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round"/><polyline points="17 8 12 3 7 8" strokeLinecap="round"/><line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round"/></> },
    announcement: { bg: "#fdf2f2", stroke: MAROON,    path: <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round"/> },
    enrollment:   { bg: "#f0fdf4", stroke: "#16a34a", path: <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14" strokeLinecap="round"/><line x1="23" y1="11" x2="17" y2="11" strokeLinecap="round"/></> },
    grade:        { bg: "#fefce8", stroke: "#ca8a04", path: <><path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round"/></> },
    general:      { bg: "#f9fafb", stroke: "#9ca3af", path: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/></> },
  };
  const c = cfg[type];
  return (
    <div style={{ width: 32, height: 32, borderRadius: "50%", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="13" height="13" fill="none" stroke={c.stroke} strokeWidth={2} viewBox="0 0 24 24">{c.path}</svg>
    </div>
  );
}

function ActivityIconLg({ type }: { type: ActivityItem["type"] }) {
  const cfg = {
    submission:   { bg: "#eff6ff", stroke: "#3b82f6", path: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round"/><polyline points="17 8 12 3 7 8" strokeLinecap="round"/><line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round"/></> },
    announcement: { bg: "#fdf2f2", stroke: MAROON,    path: <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round"/> },
    enrollment:   { bg: "#f0fdf4", stroke: "#16a34a", path: <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14" strokeLinecap="round"/><line x1="23" y1="11" x2="17" y2="11" strokeLinecap="round"/></> },
    grade:        { bg: "#fefce8", stroke: "#ca8a04", path: <><path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round"/></> },
    general:      { bg: "#f9fafb", stroke: "#9ca3af", path: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/></> },
  };
  const c = cfg[type];
  return (
    <div style={{ width: 36, height: 36, borderRadius: "50%", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="15" height="15" fill="none" stroke={c.stroke} strokeWidth={2} viewBox="0 0 24 24">{c.path}</svg>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CSS
───────────────────────────────────────────────────────────────────────────── */
const buildCss = () => `
  *, *::before, *::after { box-sizing: border-box; }

  .chp-root {
    font-family: ${FONT};
    background: #f1f1f0;
    min-height: 100%;
    overflow-y: auto;
  }

  /* ── Header ── */
  .chp-header {
    background: ${MAROON};
    padding: 0 24px;
    display: flex;
    align-items: flex-end;
    min-height: 110px;
  }
  .chp-header-content {
    padding: 22px 0 0;
    flex: 1;
    min-width: 0;
  }
  .chp-header-eyebrow {
    font-size: 10px;
    font-weight: 800;
    color: rgba(255,255,255,.45);
    text-transform: uppercase;
    letter-spacing: .22em;
    margin: 0 0 6px;
  }
  .chp-header-title {
    font-size: clamp(16px, 4vw, 22px);
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
  .chp-header-tabs {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    margin-top: 16px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .chp-header-tabs::-webkit-scrollbar { display: none; }
  .chp-header-tab {
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
  .chp-header-tab:hover { color: rgba(255,255,255,.85); }
  .chp-header-tab.active {
    background: #f1f1f0;
    color: ${MAROON};
    cursor: default;
  }

  /* ── Stat strip ── */
  .chp-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: #fff;
    border-bottom: 1px solid #e5e7eb;
  }
  .chp-stat {
    padding: 14px 16px;
    border-right: 1px solid #f0f0f0;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: default;
    transition: background .12s;
    min-width: 0;
  }
  .chp-stat:last-child { border-right: none; }
  .chp-stat:hover { background: #fafafa; }
  .chp-stat-icon {
    width: 34px; height: 34px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .chp-stat-info { min-width: 0; }
  .chp-stat-value { font-size: clamp(16px,3vw,20px); font-weight: 900; line-height: 1; }
  .chp-stat-label { font-size: 10px; font-weight: 600; color: #9ca3af; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* ── Body ── */
  .chp-body {
    padding: 20px 20px 32px;
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 16px;
    align-items: start;
  }
  .chp-main { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .chp-side  { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

  /* ── Card ── */
  .chp-card { background: #fff; border-radius: 12px; border: 1px solid #e9eaeb; overflow: hidden; }
  .chp-card-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 18px 0; gap: 8px;
  }
  .chp-card-title {
    font-size: 11px; font-weight: 800; color: #111827;
    text-transform: uppercase; letter-spacing: .1em; margin: 0;
    display: flex; align-items: center; gap: 6px;
  }
  .chp-card-action {
    font-size: 11px; font-weight: 700; color: ${MAROON};
    background: none; border: none; cursor: pointer;
    padding: 0; font-family: ${FONT}; white-space: nowrap; flex-shrink: 0;
  }
  .chp-card-action:hover { text-decoration: underline; }
  .chp-card-body { padding: 12px 18px 16px; }

  /* ── Quick actions ── */
  .chp-actions-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 8px; padding: 14px 18px 16px;
  }
  .chp-action-btn {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 14px; border-radius: 10px;
    border: 1px solid #e9eaeb; background: #fafafa;
    cursor: pointer; font-family: ${FONT}; text-align: left;
    transition: all .14s; width: 100%; min-height: 52px;
  }
  .chp-action-btn:hover {
    border-color: ${MAROON}; background: #fdf2f2;
    transform: translateY(-1px); box-shadow: 0 2px 8px rgba(123,17,19,.08);
  }
  .chp-action-btn:active { transform: translateY(0); }
  .chp-action-icon {
    width: 32px; height: 32px; border-radius: 8px;
    background: #fdf2f2; display: flex; align-items: center;
    justify-content: center; flex-shrink: 0; color: ${MAROON};
  }
  .chp-action-label { font-size: 11.5px; font-weight: 700; color: #374151; line-height: 1.3; }

  /* ── Activity preview rows ── */
  .chp-activity-row {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 9px 0; border-bottom: 1px solid #f9fafb;
  }
  .chp-activity-row:last-child { border-bottom: none; }

  /* ── Enrollment ── */
  .chp-enroll-row {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 0; border-bottom: 1px solid #f9fafb;
  }
  .chp-enroll-row:last-child { border-bottom: none; }

  /* ── Spinner ── */
  .chp-spinner {
    width: 14px; height: 14px;
    border: 2px solid #f0e4e4; border-top: 2px solid ${MAROON};
    border-radius: 50%; animation: chp-spin .8s linear infinite; flex-shrink: 0;
  }
  @keyframes chp-spin { to { transform: rotate(360deg); } }

  /* ── Empty ── */
  .chp-empty { font-size: 12px; color: #9ca3af; text-align: center; padding: 16px 0; margin: 0; }

  /* ── View more btn ── */
  .chp-view-more {
    width: 100%; margin-top: 10px;
    padding: 8px; background: #f9fafb;
    border: 1px solid #e9eaeb; border-radius: 8px;
    font-size: 11.5px; font-weight: 700; color: ${MAROON};
    cursor: pointer; font-family: ${FONT};
    transition: background .12s; display: flex;
    align-items: center; justify-content: center; gap: 5px;
  }
  .chp-view-more:hover { background: #fdf2f2; }

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

  /* ── Drawer header ── */
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

  /* ── Toolbar ── */
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
    padding: 6px 12px; cursor: pointer; font-family: ${FONT};
    display: flex; align-items: center; gap: 5px;
    transition: opacity .12s; white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
  }
  .act-btn-clear:hover { opacity: .85; }
  .act-btn-clear:disabled { opacity: .38; cursor: default; }

  .act-btn-clearall {
    font-size: 11px; font-weight: 700; color: #6b7280;
    background: none; border: 1px solid #e5e7eb; border-radius: 7px;
    padding: 6px 10px; cursor: pointer; font-family: ${FONT};
    transition: all .12s; white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
  }
  .act-btn-clearall:hover { border-color: ${MAROON}; color: ${MAROON}; }

  /* ── List ── */
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

  /* ── Empty state ── */
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
     MOBILE: bottom sheet
  ══════════════════════════════════════ */
  @media (max-width: 600px) {
    .act-overlay { align-items: flex-end; justify-content: center; }
    .act-drawer {
      width: 100%; height: 90dvh;
      border-radius: 20px 20px 0 0;
      box-shadow: 0 -6px 40px rgba(0,0,0,.16);
      animation: act-slideup .22s cubic-bezier(.25,.46,.45,.94);
    }
    @keyframes act-slideup { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .act-head { border-radius: 20px 20px 0 0; padding-top: 8px; flex-direction: column; align-items: stretch; }
    .act-handle {
      width: 36px; height: 4px; border-radius: 99px;
      background: rgba(255,255,255,.3); margin: 0 auto 10px;
    }
    .act-head-row { display: flex; align-items: center; gap: 10px; }
    .act-btn-clearall { display: none; }
  }

  /* ══════════════════════════════════════
     RESPONSIVE BREAKPOINTS
  ══════════════════════════════════════ */
  @media (max-width: 1024px) {
    .chp-body { grid-template-columns: 1fr; padding: 16px 16px 28px; }
    .chp-side { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  }
  @media (max-width: 768px) {
    .chp-header { min-height: 88px; padding: 0 16px; }
    .chp-header-content { padding: 16px 0 0; }
    .chp-stats { grid-template-columns: repeat(2, 1fr); }
    .chp-stat:nth-child(2) { border-right: none; }
    .chp-stat:nth-child(1), .chp-stat:nth-child(2) { border-bottom: 1px solid #f0f0f0; }
    .chp-body { padding: 12px 12px 24px; gap: 12px; }
    .chp-side { grid-template-columns: 1fr; }
    .chp-actions-grid { grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px 14px 14px; }
    .chp-card-body { padding: 10px 14px 14px; }
    .chp-card-header { padding: 12px 14px 0; }
  }
  @media (max-width: 480px) {
    .chp-header { min-height: 80px; }
    .chp-header-tab { font-size: 10px; padding: 6px 10px 7px; }
    .chp-stats { grid-template-columns: repeat(2, 1fr); }
    .chp-stat { padding: 12px; gap: 8px; }
    .chp-stat-icon { width: 30px; height: 30px; }
    .chp-actions-grid { gap: 6px; padding: 10px 12px 12px; }
    .chp-action-btn { padding: 9px 10px; gap: 8px; min-height: 48px; }
    .chp-action-label { font-size: 11px; }
    .chp-action-icon { width: 28px; height: 28px; }
    .act-toolbar { gap: 6px; }
  }
  @media (max-width: 360px) {
    .chp-actions-grid { grid-template-columns: 1fr; }
  }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   ACTIVITY DRAWER COMPONENT
───────────────────────────────────────────────────────────────────────────── */
function ActivityDrawer({
  activity,
  onClose,
  onClearItems,
}: {
  activity: ActivityItem[];
  onClose: () => void;
  onClearItems: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected  = activity.length > 0 && selected.size === activity.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected || someSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(activity.map(a => a.id)));
    }
  }

  function toggleItem(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleClearSelected() {
    if (selected.size === 0) return;
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

  // Escape key
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="act-overlay" onClick={onBackdropClick} role="dialog" aria-modal="true" aria-label="All Activity">
      <div className="act-drawer">

        {/* Header */}
        <div className="act-head">
          {/* Mobile drag handle (hidden on desktop via CSS) */}
          <div className="act-handle" aria-hidden="true" style={{ display: "none" }}/>
          <div className="act-head-row" style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
            <p className="act-head-title">
              All Activity
              {activity.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.5)", marginLeft: 7 }}>
                  {activity.length} item{activity.length !== 1 ? "s" : ""}
                </span>
              )}
            </p>
            <button className="act-close" onClick={onClose} aria-label="Close drawer">
              <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth={2.2} viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/>
                <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Toolbar */}
        {activity.length > 0 && (
          <div className="act-toolbar">
            {/* Select all */}
            <div className="act-toolbar-left">
              <div
                className="act-cb-row"
                onClick={toggleAll}
                role="checkbox"
                aria-checked={allSelected ? "true" : someSelected ? "mixed" : "false"}
                tabIndex={0}
                onKeyDown={e => e.key === " " && (e.preventDefault(), toggleAll())}
              >
                <div className={`act-cb ${allSelected ? "on" : someSelected ? "mid" : ""}`}>
                  {allSelected && (
                    <svg width="9" height="9" fill="none" stroke="#fff" strokeWidth={2.5} viewBox="0 0 12 12">
                      <polyline points="1.5,6 4.5,9 10.5,3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {someSelected && !allSelected && (
                    <svg width="8" height="2" fill="none" stroke="#fff" strokeWidth={2.5} viewBox="0 0 8 2">
                      <line x1="0" y1="1" x2="8" y2="1" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                <span className="act-cb-label">Select all</span>
              </div>
              {selected.size > 0 && (
                <span className="act-sel-count">{selected.size} selected</span>
              )}
            </div>

            {/* Clear selected */}
            <button
              className="act-btn-clear"
              onClick={handleClearSelected}
              disabled={selected.size === 0}
            >
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6" strokeLinecap="round"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round"/>
              </svg>
              {selected.size > 0 ? `Clear (${selected.size})` : "Clear"}
            </button>

            {/* Clear all */}
            <button className="act-btn-clearall" onClick={handleClearAll}>
              Clear all
            </button>
          </div>
        )}

        {/* List / empty */}
        {activity.length === 0 ? (
          <div className="act-blank">
            <div className="act-blank-icon">
              <svg width="22" height="22" fill="none" stroke="#9ca3af" strokeWidth={1.8} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/>
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
                <div
                  key={item.id}
                  className={`act-item${isSel ? " sel" : ""}`}
                  onClick={() => toggleItem(item.id)}
                  role="listitem"
                >
                  {/* Checkbox */}
                  <div className="act-item-cb">
                    {isSel && (
                      <svg width="9" height="9" fill="none" stroke="#fff" strokeWidth={2.5} viewBox="0 0 12 12">
                        <polyline points="1.5,6 4.5,9 10.5,3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>

                  <ActivityIconLg type={item.type}/>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12.5, color: "#374151", margin: 0, lineHeight: 1.55 }}>
                      {item.user && (
                        <span style={{ fontWeight: 700, color: "#111827" }}>{item.user} </span>
                      )}
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
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
const PREVIEW_COUNT = 5;

export default function CourseHomePage({ courseId, courseName: initialCourseName }: Props) {
  const router = useRouter();

  const [courseName,        setCourseName]        = useState(initialCourseName);
  const [stats,             setStats]             = useState<Stats>({ people: 0, announcements: 0, assignments: 0, forms: 0 });
  const [activity,          setActivity]          = useState<ActivityItem[]>([]);
  const [loadingActivity,   setLoadingActivity]   = useState(true);
  const [enrollments,       setEnrollments]       = useState<RecentEnrollment[]>([]);
  const [showDrawer,        setShowDrawer]        = useState(false);

  useEffect(() => {
    if (!courseId) return;

    fetch(`/api/admin/courses/${courseId}`)
      .then(r => r.json())
      .then(d => { if (d.course?.name) setCourseName(d.course.name); })
      .catch(() => {});

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
      .catch(() => setEnrollments([]));
  }, [courseId]);

  const handleClearItems = useCallback((ids: string[]) => {
    setActivity(prev => prev.filter(a => !ids.includes(a.id)));
    // TODO: persist via API:
    // fetch(`/api/admin/courses/${courseId}/activity`, { method: "DELETE", body: JSON.stringify({ ids }) })
  }, []);

  const previewActivity = activity.slice(0, PREVIEW_COUNT);
  const extraCount      = activity.length - PREVIEW_COUNT;

  const quickActions = [
    {
      label: "New Announcement",
      icon: <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round" strokeLinejoin="round"/>,
      onClick: () => router.push(`/admin/courses/${courseId}/announcements`),
    },
    {
      label: "New Assignment",
      icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9" strokeLinecap="round"/><line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round"/></>,
      onClick: () => router.push(`/admin/courses/${courseId}/assignments`),
    },
    {
      label: "View Grades",
      icon: <><path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/></>,
      onClick: () => router.push(`/admin/courses/${courseId}/grades`),
    },
    {
      label: "View People",
      icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round"/></>,
      onClick: () => router.push(`/admin/courses/${courseId}/people`),
    },
    {
      label: "View Forms",
      icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10h8M8 14h5" strokeLinecap="round"/><circle cx="17" cy="14" r="2.5"/></>,
      onClick: () => router.push(`/admin/courses/${courseId}/forms`),
    },
  ];

  const statItems = [
    { label: "Staff",         value: stats.people,        color: "#2563eb", bg: "#eff6ff", icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round"/></> },
    { label: "Assignments",   value: stats.assignments,   color: MAROON,    bg: "#fdf2f2", icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9" strokeLinecap="round"/><line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round"/></> },
    { label: "Forms",         value: stats.forms,         color: "#0891b2", bg: "#ecfeff", icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10h8M8 14h5" strokeLinecap="round"/><circle cx="17" cy="14" r="2.5"/></> },
    { label: "Announcements", value: stats.announcements, color: "#7c3aed", bg: "#f5f3ff", icon: <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round"/> },
  ];

  return (
    <>
      <style>{buildCss()}</style>
      <div className="chp-root">

        {/* ── Header ── */}
        <div className="chp-header">
          <div className="chp-header-content">
            <p className="chp-header-eyebrow">Office Overview</p>
            <h1 className="chp-header-title">{courseName}</h1>
            <div className="chp-header-tabs">
              <button className="chp-header-tab active">Home</button>
            </div>
          </div>
        </div>

        {/* ── Stat strip ── */}
        <div className="chp-stats">
          {statItems.map(s => (
            <div key={s.label} className="chp-stat">
              <div className="chp-stat-icon" style={{ background: s.bg }}>
                <svg width="16" height="16" fill="none" stroke={s.color} strokeWidth={2} viewBox="0 0 24 24">
                  {s.icon}
                </svg>
              </div>
              <div className="chp-stat-info">
                <div className="chp-stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="chp-stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="chp-body">

          {/* ── Main column ── */}
          <div className="chp-main">

            {/* Quick Actions */}
            <div className="chp-card">
              <div className="chp-card-header" style={{ paddingBottom: 0 }}>
                <p className="chp-card-title">Quick Actions</p>
              </div>
              <div className="chp-actions-grid">
                {quickActions.map(a => (
                  <button key={a.label} type="button" className="chp-action-btn" onClick={a.onClick}>
                    <div className="chp-action-icon">
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        {a.icon}
                      </svg>
                    </div>
                    <span className="chp-action-label">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="chp-card">
              <div className="chp-card-header">
                <p className="chp-card-title">
                  Recent Activity
                  {activity.length > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "none", letterSpacing: 0 }}>
                      ({activity.length})
                    </span>
                  )}
                </p>
                {!loadingActivity && (
                  <button className="chp-card-action" onClick={() => setShowDrawer(true)}>
                    View all →
                  </button>
                )}
              </div>
              <div className="chp-card-body">
                {loadingActivity ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="chp-spinner"/>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>Loading…</span>
                  </div>
                ) : activity.length === 0 ? (
                  <p className="chp-empty">No recent activity.</p>
                ) : (
                  <>
                    {previewActivity.map(item => (
                      <div key={item.id} className="chp-activity-row">
                        <ActivityIcon type={item.type}/>
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
                      <button className="chp-view-more" onClick={() => setShowDrawer(true)}>
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

          {/* ── Sidebar column ── */}
          <div className="chp-side">

            {/* Recent Enrollments */}
            <div className="chp-card">
              <div className="chp-card-header">
                <p className="chp-card-title">Recent Enrollments</p>
                <button className="chp-card-action" onClick={() => router.push(`/admin/courses/${courseId}/people`)}>
                  View all
                </button>
              </div>
              <div className="chp-card-body">
                {enrollments.length === 0 ? (
                  <p className="chp-empty">No recent enrollments.</p>
                ) : enrollments.map(e => (
                  <div key={e.id} className="chp-enroll-row">
                    <Avatar name={e.name} image={e.image} size={32}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.name}
                      </p>
                      <p style={{ fontSize: 10.5, color: "#9ca3af", margin: "1px 0 0" }}>
                        {e.role} · {e.joinedAt}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Activity Drawer ── */}
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