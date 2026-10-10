"use client";
// src/components/admin/CourseHomePage.tsx

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
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

/* Activity type config */
const ACTIVITY_CFG = {
  submission: {
    bg: "#eff6ff",
    stroke: "#3b82f6",
    path: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" />
        <polyline points="17 8 12 3 7 8" strokeLinecap="round" />
        <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
      </>
    ),
  },
  announcement: {
    bg: MAROON_LIGHT,
    stroke: MAROON,
    path: <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round" />,
  },
  enrollment: {
    bg: "#f0fdf4",
    stroke: "#16a34a",
    path: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" strokeLinecap="round" />
        <line x1="23" y1="11" x2="17" y2="11" strokeLinecap="round" />
      </>
    ),
  },
  grade: {
    bg: "#fefce8",
    stroke: "#ca8a04",
    path: (
      <>
        <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" />
      </>
    ),
  },
  general: {
    bg: "#f9fafb",
    stroke: "#9ca3af",
    path: (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
        <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
      </>
    ),
  },
};

function ActivityDot({ type, size = 30 }: { type: ActivityItem["type"]; size?: number }) {
  const c = ACTIVITY_CFG[type];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: c.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.43} height={size * 0.43} fill="none" stroke={c.stroke} strokeWidth={2} viewBox="0 0 24 24">
        {c.path}
      </svg>
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
    -webkit-font-smoothing: antialiased;
  }

  /* ── Header ── */
  .chp-header {
    background: ${MAROON};
    padding: 0 20px;
    display: flex;
    align-items: flex-end;
    min-height: 80px;
  }
  .chp-header-content {
    padding: 18px 0 16px;
    flex: 1;
    min-width: 0;
  }
  .chp-eyebrow {
    font-size: 9px;
    font-weight: 700;
    color: rgba(255,255,255,.4);
    text-transform: uppercase;
    letter-spacing: .22em;
    margin: 0 0 5px;
  }
  .chp-title {
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
  /* ── Stats strip ── */
  .chp-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: #fff;
    border-bottom: 1px solid #e9eaeb;
  }
  .chp-stat {
    padding: 12px 10px;
    border-right: 1px solid #f0f0f0;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    cursor: default;
  }
  .chp-stat:last-child { border-right: none; }
  .chp-stat-icon {
    width: 30px; height: 30px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .chp-stat-value {
    font-size: clamp(16px, 3.5vw, 20px);
    font-weight: 900;
    line-height: 1;
  }
  .chp-stat-label {
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
  .chp-body {
    padding: 14px 14px 32px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* ── Card ── */
  .chp-card {
    background: #fff;
    border-radius: 14px;
    border: 1px solid #e9eaeb;
    overflow: hidden;
  }
  .chp-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px 0;
    gap: 8px;
  }
  .chp-card-title {
    font-size: 10px;
    font-weight: 800;
    color: #111827;
    text-transform: uppercase;
    letter-spacing: .1em;
    margin: 0;
  }
  .chp-card-link {
    font-size: 11px;
    font-weight: 700;
    color: ${MAROON};
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-family: ${FONT};
    white-space: nowrap;
    flex-shrink: 0;
  }
  .chp-card-link:hover { text-decoration: underline; }

  /* ── Activity list ── */
  .chp-activity-list {
    padding: 4px 16px 14px;
    display: flex;
    flex-direction: column;
  }
  .chp-activity-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid #f3f4f6;
  }
  .chp-activity-item:last-child { border-bottom: none; }
  .chp-activity-text {
    font-size: 12px;
    color: #374151;
    line-height: 1.55;
    margin: 0;
  }
  .chp-activity-user {
    font-weight: 700;
    color: #111827;
  }
  .chp-activity-time {
    font-size: 10.5px;
    color: #9ca3af;
    margin: 3px 0 0;
  }

  /* ── View more ── */
  .chp-view-more {
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
    font-family: ${FONT};
    transition: background .12s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
  }
  .chp-view-more:hover { background: ${MAROON_LIGHT}; }

  /* ── Enrollment rows ── */
  .chp-enroll-list {
    padding: 8px 16px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .chp-enroll-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    background: #fafafa;
    border-radius: 10px;
    border: 1px solid #f0f0f0;
    transition: background .12s;
  }
  .chp-enroll-item:hover { background: ${MAROON_LIGHT}; }
  .chp-enroll-name {
    font-size: 12px;
    font-weight: 700;
    color: #111827;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chp-enroll-meta {
    font-size: 10.5px;
    color: #9ca3af;
    margin: 1px 0 0;
  }
  .chp-enroll-time {
    font-size: 10px;
    color: #9ca3af;
    margin-left: auto;
    flex-shrink: 0;
    font-weight: 500;
  }

  /* ── Role badge ── */
  .chp-role-badge {
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

  /* ── Spinner ── */
  .chp-spinner {
    width: 14px; height: 14px;
    border: 2px solid #f0e4e4;
    border-top: 2px solid ${MAROON};
    border-radius: 50%;
    animation: chp-spin .8s linear infinite;
    flex-shrink: 0;
  }
  @keyframes chp-spin { to { transform: rotate(360deg); } }

  /* ── Empty ── */
  .chp-empty {
    font-size: 12px;
    color: #9ca3af;
    text-align: center;
    padding: 14px 0;
    margin: 0;
  }

  /* ── Section divider label ── */
  .chp-section-label {
    font-size: 9px;
    font-weight: 800;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: .14em;
    padding: 0 4px;
    margin: 4px 0 2px;
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
    transition: background .12s;
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
  }
  .act-btn-clear:hover { opacity: .85; }
  .act-btn-clear:disabled { opacity: .38; cursor: default; }

  .act-btn-clearall {
    font-size: 11px; font-weight: 700; color: #6b7280;
    background: none; border: 1px solid #e5e7eb; border-radius: 7px;
    padding: 6px 10px; cursor: pointer; font-family: ${FONT};
    transition: all .12s; white-space: nowrap;
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
    .chp-header { min-height: 70px; padding: 0 14px; }
    .chp-header-content { padding: 14px 0 12px; }
    .chp-stats { grid-template-columns: repeat(2, 1fr); }
    .chp-stat:nth-child(2) { border-right: none; }
    .chp-stat:nth-child(1),
    .chp-stat:nth-child(2) { border-bottom: 1px solid #f0f0f0; }
    .chp-body { padding: 12px 12px 28px; gap: 10px; }
  }

  @media (max-width: 480px) {
    .chp-header { min-height: 64px; }
    .chp-tab { font-size: 10px; padding: 5px 11px 6px; }
    .chp-stat { padding: 10px 8px; gap: 6px; }
    .chp-stat-icon { width: 26px; height: 26px; border-radius: 6px; }
    .chp-chip { padding: 6px 11px 6px 7px; }
    .chp-chip-icon { width: 22px; height: 22px; }
    .chp-chip-label { font-size: 11px; }
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
                  {someSelected && !allSelected && (
                    <svg width="8" height="2" fill="none" stroke="#fff" strokeWidth={2.5} viewBox="0 0 8 2">
                      <line x1="0" y1="1" x2="8" y2="1" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
                <span className="act-cb-label">Select all</span>
              </div>
              {selected.size > 0 && (
                <span className="act-sel-count">{selected.size} selected</span>
              )}
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
              <svg width="22" height="22" fill="none" stroke="#9ca3af" strokeWidth={1.8} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
                <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
              </svg>
            </div>
            <p className="act-blank-text">No activity to show.</p>
          </div>
        ) : (
          <div className="act-list" role="list">
            {activity.map((item) => {
              const isSel = selected.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`act-item${isSel ? " sel" : ""}`}
                  onClick={() => toggleItem(item.id)}
                  role="listitem"
                >
                  <div className="act-item-cb">
                    {isSel && (
                      <svg width="9" height="9" fill="none" stroke="#fff" strokeWidth={2.5} viewBox="0 0 12 12">
                        <polyline points="1.5,6 4.5,9 10.5,3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
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
   ROLE BADGE
───────────────────────────────────────────────────────────────────────────── */
const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  TEACHER:  { bg: "#eff6ff", color: "#1d4ed8" },
  STUDENT:  { bg: "#f0fdf4", color: "#15803d" },
  ADMIN:    { bg: MAROON_LIGHT, color: MAROON },
  STAFF:    { bg: "#fefce8", color: "#a16207" },
};

function RoleBadge({ role }: { role: string }) {
  const key = role.toUpperCase();
  const c = ROLE_COLORS[key] ?? { bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span
      className="chp-role-badge"
      style={{ background: c.bg, color: c.color }}
    >
      {role}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
const PREVIEW_COUNT = 5;

export default function CourseHomePage({ courseId, courseName: initialCourseName }: Props) {
  const router = useRouter();

  const [courseName, setCourseName] = useState(initialCourseName);
  const [stats, setStats] = useState<Stats>({ people: 0, announcements: 0, assignments: 0, forms: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [enrollments, setEnrollments] = useState<RecentEnrollment[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);

  useEffect(() => {
    if (!courseId) return;

    fetch(`/api/admin/courses/${courseId}`)
      .then((r) => r.json())
      .then((d) => { if (d.course?.name) setCourseName(d.course.name); })
      .catch(() => {});

    fetch(`/api/admin/courses/${courseId}/activity`)
      .then((r) => r.json())
      .then((d) => {
        setActivity(d.activity ?? []);
        setStats(d.stats ?? { people: 0, announcements: 0, assignments: 0, forms: 0 });
      })
      .catch(() => {})
      .finally(() => setLoadingActivity(false));

    fetch(`/api/admin/courses/${courseId}/enrollments/recent`)
      .then((r) => r.json())
      .then((d) => setEnrollments(d.enrollments ?? []))
      .catch(() => setEnrollments([]));
  }, [courseId]);

  const handleClearItems = useCallback((ids: string[]) => {
    setActivity((prev) => prev.filter((a) => !ids.includes(a.id)));
  }, []);

  const previewActivity = activity.slice(0, PREVIEW_COUNT);
  const extraCount = activity.length - PREVIEW_COUNT;

  /* ── Stat items ── */
  const statItems = [
    {
      label: "Staff",
      value: stats.people,
      color: "#2563eb",
      bg: "#eff6ff",
      icon: (
        <>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
        </>
      ),
    },
    {
      label: "Assignments",
      value: stats.assignments,
      color: MAROON,
      bg: MAROON_LIGHT,
      icon: (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="9" x2="15" y2="9" strokeLinecap="round" />
          <line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round" />
        </>
      ),
    },
    {
      label: "Forms",
      value: stats.forms,
      color: "#0891b2",
      bg: "#ecfeff",
      icon: (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M8 10h8M8 14h5" strokeLinecap="round" />
        </>
      ),
    },
    {
      label: "Announce.",
      value: stats.announcements,
      color: "#7c3aed",
      bg: "#f5f3ff",
      icon: <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round" />,
    },
  ];

  return (
    <>
      <style>{buildCss()}</style>
      <div className="chp-root">

        {/* ── Header ── */}
        <div className="chp-header">
          <div className="chp-header-content">
            <p className="chp-eyebrow">Office Overview</p>
            <h1 className="chp-title">{courseName}</h1>
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div className="chp-stats">
          {statItems.map((s) => (
            <div key={s.label} className="chp-stat">
              <div className="chp-stat-icon" style={{ background: s.bg }}>
                <svg width="15" height="15" fill="none" stroke={s.color} strokeWidth={2} viewBox="0 0 24 24">
                  {s.icon}
                </svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="chp-stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="chp-stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="chp-body">

          {/* Recent Activity */}
          <div className="chp-card">
            <div className="chp-card-head">
              <p className="chp-card-title">
                Recent Activity
                {activity.length > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "none", letterSpacing: 0, marginLeft: 5 }}>
                    ({activity.length})
                  </span>
                )}
              </p>
              {!loadingActivity && (
                <button className="chp-card-link" onClick={() => setShowDrawer(true)}>
                  View all →
                </button>
              )}
            </div>
            <div className="chp-activity-list">
              {loadingActivity ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0" }}>
                  <div className="chp-spinner" />
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>Loading…</span>
                </div>
              ) : activity.length === 0 ? (
                <p className="chp-empty">No recent activity.</p>
              ) : (
                <>
                  {previewActivity.map((item) => (
                    <div key={item.id} className="chp-activity-item">
                      <ActivityDot type={item.type} size={30} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="chp-activity-text">
                          {item.user && <span className="chp-activity-user">{item.user} </span>}
                          {item.text}
                        </p>
                        <p className="chp-activity-time">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Recent Enrollments */}
          <div className="chp-card">
            <div className="chp-card-head">
              <p className="chp-card-title">Recent Enrollments</p>
              <button
                className="chp-card-link"
                onClick={() => router.push(`/admin/courses/${courseId}/people`)}
              >
                View all
              </button>
            </div>
            <div className="chp-enroll-list">
              {enrollments.length === 0 ? (
                <p className="chp-empty">No recent enrollments.</p>
              ) : (
                enrollments.map((e) => (
                  <div key={e.id} className="chp-enroll-item">
                    <Avatar name={e.name} image={e.image} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="chp-enroll-name">{e.name}</p>
                      <p className="chp-enroll-meta">{e.joinedAt}</p>
                    </div>
                    <RoleBadge role={e.role} />
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Activity Drawer */}
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