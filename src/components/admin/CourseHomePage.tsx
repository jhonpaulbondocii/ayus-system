"use client";
// src/components/admin/CourseHomePage.tsx

import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const MAROON = "#7b1113";
const MAROON_LIGHT = "#fdf2f2";
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
  type: "submission" | "announcement" | "enrollment" | "grade" | "general" | "assignment" | "form";
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


interface QuickAction {
  key: string;
  label: string;
  desc: string;
  meta?: string;
  href: string;
  primary?: boolean;
  icon: ReactNode;
}

/* ─────────────────────────────────────────────────────────────────────────────
   ICONS (24x24 stroke icons, one place to edit)
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
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" />
      <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" />
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
};

function Icon({ name, size = 16, stroke = "currentColor" }: { name: keyof typeof ICONS; size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} fill="none" stroke={stroke} strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SMALL PIECES
───────────────────────────────────────────────────────────────────────────── */
function Avatar({ name, image, size = 32 }: { name: string; image: string | null; size?: number }) {
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
  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: MAROON_LIGHT,
        color: MAROON,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.34,
        fontWeight: 800,
        flexShrink: 0,
        letterSpacing: "-0.02em",
      }}
    >
      {initials || name?.[0]?.toUpperCase()}
    </div>
  );
}

const ACTIVITY_CFG: Record<ActivityItem["type"], { bg: string; stroke: string; icon: keyof typeof ICONS }> = {
  submission: { bg: "#eff6ff", stroke: "#3b82f6", icon: "upload" },
  assignment: { bg: "#eff6ff", stroke: "#3b82f6", icon: "assignment" },
  form: { bg: "#ecfeff", stroke: "#0891b2", icon: "form" },
  announcement: { bg: MAROON_LIGHT, stroke: MAROON, icon: "announce" },
  enrollment: { bg: "#f0fdf4", stroke: "#16a34a", icon: "person" },
  grade: { bg: "#fefce8", stroke: "#ca8a04", icon: "grade" },
  general: { bg: "#f9fafb", stroke: "#9ca3af", icon: "info" },
};

function ActivityDot({ type, size = 28 }: { type: ActivityItem["type"]; size?: number }) {
  const c = ACTIVITY_CFG[type] ?? ACTIVITY_CFG.general;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: c.bg,
        border: "2px solid #fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon name={c.icon} size={Math.round(size * 0.46)} stroke={c.stroke} />
    </div>
  );
}

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  TEACHER: { bg: "#eff6ff", color: "#1d4ed8" },
  STUDENT: { bg: "#f0fdf4", color: "#15803d" },
  ADMIN: { bg: MAROON_LIGHT, color: MAROON },
  STAFF: { bg: "#fefce8", color: "#a16207" },
};

function RoleBadge({ role }: { role: string }) {
  const c = ROLE_COLORS[role.toUpperCase()] ?? { bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span className="ch-role" style={{ background: c.bg, color: c.color }}>
      {role.toLowerCase()}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CSS
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
  .ch-root a { text-decoration: none; color: inherit; }
  .ch-root :focus-visible,
  .act-overlay :focus-visible { outline: 2px solid ${MAROON}; outline-offset: 2px; }

  /* ── Masthead ── */
  .ch-masthead { background: ${MAROON}; color: #fff; }
  .ch-masthead-inner {
    padding: 18px 32px;
  }
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
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 28px 24px;
    align-items: start;
    min-width: 0;
  }
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

  /* primary action: filled row */
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
  .ch-feed-item {
    position: relative;
    display: flex;
    gap: 12px;
    padding: 8px 0;
  }
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
  @media (max-width: 1280px) {
    .ch-main { grid-template-columns: minmax(0, 1fr); }
  }
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
   ACTIVITY DRAWER
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
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
const ACTIVITY_PREVIEW = 5;


export default function CourseHomePage({ courseId, courseName: initialCourseName }: Props) {
  const router = useRouter();

  const [courseName, setCourseName] = useState(initialCourseName);
  const [stats, setStats] = useState<Stats>({ people: 0, announcements: 0, assignments: 0, forms: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);

  useEffect(() => {
    if (!courseId) return;

    fetch(`/api/admin/courses/${courseId}`)
      .then((r) => r.json())
      .then((d) => { if (d.course?.name) setCourseName(d.course.name); })
      .catch(() => {});

    fetch(`/api/admin/courses/${courseId}/activity`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load activity"))))
      .then((d) => {
        setActivity(d.activity ?? []);
        setStats({
          people: d.stats?.people ?? 0,
          announcements: d.stats?.announcements ?? 0,
          assignments: d.stats?.assignments ?? 0,
          forms: d.stats?.forms ?? 0,
        });
      })
      .catch(() => {})
      .finally(() => setLoadingActivity(false));
  }, [courseId]);

  const handleClearItems = useCallback((ids: string[]) => {
    setActivity((prev) => prev.filter((a) => !ids.includes(a.id)));
  }, []);

  /* ── Quick actions ──
     NOTE: only the /people route exists in your current code. The other hrefs are
     placeholders: change them to match your real routes. */
  const base = `/admin/courses/${courseId}`;

  const createActions: QuickAction[] = [
    {
      key: "announce",
      label: "New announcement",
      desc: "Post news or a reminder to everyone enrolled.",
      meta: stats.announcements ? `${stats.announcements} posted` : undefined,
      href: `${base}/announcements/new`,
      icon: <Icon name="announce" size={18} />,
    },
    {
      key: "assignment",
      label: "New assignment",
      desc: "Create a task with a deadline and points.",
      meta: stats.assignments ? `${stats.assignments} total` : undefined,
      href: `${base}/assignments/new`,
      icon: <Icon name="assignment" size={18} />,
    },
    {
      key: "form",
      label: "New form",
      desc: "Build a survey, quiz, or registration form.",
      meta: stats.forms ? `${stats.forms} total` : undefined,
      href: `${base}/forms/new`,
      icon: <Icon name="form" size={18} />,
    },
  ];

  const manageActions: QuickAction[] = [
    {
      key: "person",
      label: "Add people",
      desc: "Enroll students or staff, one by one or in bulk.",
      meta: stats.people ? `${stats.people} enrolled` : undefined,
      href: `${base}/people`,
      icon: <Icon name="person" size={18} />,
    },
    {
      key: "grade",
      label: "Grade submissions",
      desc: "Review what was handed in and give grades.",
      href: `${base}/grading`,
      icon: <Icon name="grade" size={18} />,
    },
    {
      key: "settings",
      label: "Course settings",
      desc: "Change the name, dates, enrollment code, and access.",
      href: `${base}/settings`,
      icon: <Icon name="settings" size={18} />,
    },
  ];


  const previewActivity = activity.slice(0, ACTIVITY_PREVIEW);

  const renderActions = (list: QuickAction[]) => (
    <ul className="ch-actions">
      {list.map((a) => (
        <li key={a.key}>
          <Link href={a.href} className={`ch-action${a.primary ? " primary" : ""}`}>
            <span className="ch-action-icon">{a.icon}</span>
            <span className="ch-action-body">
              <span className="ch-action-label">{a.label}</span>
              <span className="ch-action-desc">{a.desc}</span>
            </span>
            {a.meta && <span className="ch-action-meta">{a.meta}</span>}
            <svg className="ch-action-go" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
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
            <h1 className="ch-title">{courseName}</h1>
          </div>
        </header>

        <div className="ch-page">
          {/* ── Main: quick actions ── */}
          <main className="ch-main">
            <section aria-labelledby="ch-create">
              <div className="ch-section-head">
                <div>
                  <h2 className="ch-section-title" id="ch-create">Create</h2>
                  <p className="ch-section-hint">Add new content to this course.</p>
                </div>
              </div>
              {renderActions(createActions)}
            </section>

            <section aria-labelledby="ch-manage">
              <div className="ch-section-head">
                <div>
                  <h2 className="ch-section-title" id="ch-manage">Manage</h2>
                  <p className="ch-section-hint">Add people, review work, and adjust the course.</p>
                </div>
              </div>
              {renderActions(manageActions)}
            </section>
          </main>

          {/* ── Aside: activity + enrollments ── */}
          <aside className="ch-aside">
            <section aria-labelledby="ch-activity">
              <div className="ch-section-head">
                <div>
                  <h2 className="ch-section-title" id="ch-activity">Recent activity</h2>
                  <p className="ch-section-hint">Latest joins, posts, and submissions in this course.</p>
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
                  <p className="ch-empty">Nothing yet. New submissions, posts, and enrollments will show up here.</p>
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