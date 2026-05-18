"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  BookOpen, MoreVertical,
  GraduationCap, Briefcase,
  ChevronDown, ChevronRight, LayoutGrid, List,
  Users,
} from "lucide-react";

interface Course {
  id: string; name: string; code: string; color: string;
  image: string | null;
  status: "PUBLISHED" | "UNPUBLISHED";
  term: string | null;
  startDate?: string | null;
  endDate?:   string | null;
  _count?: { enrollments: number };
}

type ViewMode = "grid" | "list";

const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";
const font: React.CSSProperties = { fontFamily: FONT };

const PRESET_COLORS = [
  "#e91e8c","#d41e00","#e66000","#f5a623",
  "#6d9b00","#2d7a2d","#00695c","#0770a2",
  "#1565c0","#4527a0","#6a0dad","#7b1113",
  "#37474f","#546e7a","#78909c","#5d4037",
];

// ── Nav layout detection — single consistent hook across all files ─────────────
// < 768px  → bottom nav → isBottom = true
// ≥ 768px  → side nav   → isBottom = false
const BOTTOM_NAV_BREAKPOINT = 768;

function useIsBottomNav(): boolean {
  const [isBottom, setIsBottom] = useState(false);
  useEffect(() => {
    const check = () => setIsBottom(window.innerWidth < BOTTOM_NAV_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);
  return isBottom;
}

/* ── Section Header ──────────────────────────────────────────────────────────── */

function SectionHeader({ count, collapsed, onToggle, badge, noun = "course" }: {
  count: number; collapsed: boolean; onToggle: () => void;
  badge: React.ReactNode; noun?: string;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        paddingTop: 10, paddingBottom: 10, paddingLeft: 0, paddingRight: 0,
        background: "none", border: "none", cursor: "pointer",
        fontFamily: FONT, width: "100%", minHeight: 44, textAlign: "left",
      }}
    >
      <span style={{ color: "#9ca3af", display: "flex", flexShrink: 0, transition: "transform 0.2s" }}>
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
      </span>
      {badge}
      <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, whiteSpace: "nowrap" }}>
        {count} {count === 1 ? noun : `${noun}s`}
      </span>
      <span style={{ flex: 1, height: 1, background: "#f3f4f6", marginLeft: 4 }} />
    </button>
  );
}

/* ── List Row ────────────────────────────────────────────────────────────────── */

function CourseListRow({ course, onClick, onAssignments, onDiscussions, onFiles, isBottom }: {
  course: Course; onClick: () => void;
  onAssignments: () => void; onDiscussions: () => void; onFiles: () => void;
  isBottom: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: isBottom ? 10 : 12,
        padding: isBottom ? "12px 10px" : "10px 12px",
        borderRadius: 12,
        border: "1px solid #e5e7eb", background: "#fff",
        cursor: "pointer", fontFamily: FONT,
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(123,17,19,.08)")}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
    >
      {course.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={course.image} alt={course.name}
          style={{ width: isBottom ? 36 : 32, height: isBottom ? 36 : 32, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: course.color, flexShrink: 0 }} />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: isBottom ? 13 : 13, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {course.name}
        </p>
        <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{course.code}</p>
      </div>

      {/* Action icons — hidden on bottom-nav */}
      {!isBottom && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          {[
            { title: "Assignments", cb: onAssignments, svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg> },
            { title: "Discussions", cb: onDiscussions, svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
            { title: "Files",       cb: onFiles,       svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg> },
          ].map(btn => (
            <button
              key={btn.title}
              onClick={e => { e.stopPropagation(); btn.cb(); }}
              title={btn.title}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 32, height: 32, borderRadius: 8,
                border: "none", background: "#f9fafb",
                cursor: "pointer", color: "#6b7280", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#fdf3f3"; e.currentTarget.style.color = MAROON; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.color = "#6b7280"; }}
            >
              {btn.svg}
            </button>
          ))}
        </div>
      )}

      {course.term && (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
          background: course.term === "Academic" ? "#eff6ff" : "#fffbeb",
          color: course.term === "Academic" ? "#1565c0" : "#b45309",
          border: `1px solid ${course.term === "Academic" ? "#bfdbfe" : "#fde68a"}`,
          flexShrink: 0, whiteSpace: "nowrap",
        }}>
          {course.term}
        </span>
      )}

      {/* Chevron on bottom-nav */}
      {isBottom && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </div>
  );
}

/* ── Course Card ─────────────────────────────────────────────────────────────── */

function CourseCard({
  course, onColorChange, onMove, onClick,
  onAssignments, onDiscussions, onFiles, isBottom,
}: {
  course: Course;
  onColorChange: (color: string) => void;
  onMove: (dir: "top" | "up" | "down" | "bottom") => void;
  onClick: () => void;
  onAssignments: () => void;
  onDiscussions: () => void;
  onFiles: () => void;
  isBottom: boolean;
}) {
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [menuTab,   setMenuTab]   = useState<"color" | "move">("color");
  const [hexInput,  setHexInput]  = useState(course.color);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [, startTransition]       = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { startTransition(() => setHexInput(course.color)); }, [course.color]);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-user-menu]") && !t.closest("[data-user-trigger]")) setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  const computePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const r     = triggerRef.current.getBoundingClientRect();
    const menuW = 230;
    const menuH = 300;
    const vw    = window.innerWidth;
    const vh    = window.innerHeight;
    let left = r.right - menuW;
    if (left < 8) left = 8;
    if (left + menuW > vw - 8) left = vw - menuW - 8;
    const spaceBelow = vh - r.bottom - 8;
    const top = spaceBelow >= menuH ? r.bottom + 4 : r.top - menuH - 4;
    setMenuStyle({ top, left, width: Math.min(menuW, vw - 16) });
  }, []);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuTab("color");
    setHexInput(course.color);
    const willOpen = !menuOpen;
    if (willOpen) computePosition();
    setMenuOpen(willOpen);
  };

  const closeMenu  = () => setMenuOpen(false);
  const applyColor = (e: React.MouseEvent) => {
    e.stopPropagation();
    onColorChange(hexInput.startsWith("#") ? hexInput : `#${hexInput}`);
    closeMenu();
  };

  const iconBtn = (title: string, cb: () => void, svg: React.ReactNode) => (
    <button
      onClick={e => { e.stopPropagation(); cb(); }}
      title={title}
      style={{
        background: "none", border: "none", cursor: "pointer", padding: "4px",
        color: "#c4b5b5", display: "flex", lineHeight: 1, transition: "color .15s",
        minWidth: 28, minHeight: 28, alignItems: "center", justifyContent: "center", borderRadius: 6,
      }}
      onMouseEnter={e => (e.currentTarget.style.color = MAROON)}
      onMouseLeave={e => (e.currentTarget.style.color = "#c4b5b5")}
    >
      {svg}
    </button>
  );

  const MOVE_ITEMS = [
    { label: "Move to top",    dir: "top"    as const, icon: "⇈" },
    { label: "Move up",        dir: "up"     as const, icon: "↑" },
    { label: "Move down",      dir: "down"   as const, icon: "↓" },
    { label: "Move to bottom", dir: "bottom" as const, icon: "⇊" },
  ];

  const tabStyle = (tab: string): React.CSSProperties => ({
    flex: 1, padding: "8px 0", fontSize: 11, fontWeight: 700,
    color: menuTab === tab ? MAROON : "#9ca3af",
    background: "none", border: "none", cursor: "pointer",
    borderBottom: menuTab === tab ? `2px solid ${MAROON}` : "2px solid transparent",
    fontFamily: FONT,
  });

  const dropdown = menuOpen ? createPortal(
    <div
      data-user-menu="true"
      onClick={e => e.stopPropagation()}
      style={{
        position: "fixed", zIndex: 99999, background: "#fff",
        border: "1px solid #f0e4e4", borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
        overflow: "hidden", fontFamily: FONT, ...menuStyle,
      }}
    >
      <div style={{ display: "flex", borderBottom: "1px solid #f0e4e4", background: "#fdf8f8" }}>
        <button style={tabStyle("color")} onClick={() => setMenuTab("color")}>Color</button>
        <button style={tabStyle("move")}  onClick={() => setMenuTab("move")}>Move</button>
        <button
          onClick={closeMenu}
          style={{ padding: "8px 10px", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, fontFamily: FONT, minWidth: 40 }}
        >✕</button>
      </div>

      {menuTab === "color" && (
        <div style={{ padding: "12px 14px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Nickname</p>
          <input
            value={course.name} readOnly
            style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 6, padding: "5px 8px", fontSize: 12, color: "#374151", marginBottom: 10, boxSizing: "border-box", background: "#f9fafb", fontFamily: FONT }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 4, marginBottom: 10 }}>
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => { onColorChange(c); setHexInput(c); closeMenu(); }}
                style={{ width: 22, height: 22, borderRadius: 4, background: c, padding: 0, cursor: "pointer", border: c === course.color ? `3px solid ${MAROON}` : "2px solid transparent", outline: c === course.color ? "2px solid #fff" : "none", outlineOffset: -3, transition: "transform 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.2)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
              />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: 4, background: hexInput, border: "1px solid #e5e7eb", flexShrink: 0 }} />
            <input
              value={hexInput} onChange={e => setHexInput(e.target.value)}
              style={{ flex: 1, border: "1px solid #e5e7eb", borderRadius: 6, padding: "5px 8px", fontSize: 12, fontFamily: "monospace", outline: "none" }}
              onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
              onBlur={e  => (e.currentTarget.style.borderColor = "#e5e7eb")}
              onKeyDown={e => e.key === "Enter" && applyColor(e as unknown as React.MouseEvent)}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
            <button
              onClick={closeMenu}
              style={{ padding: "5px 12px", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#374151", fontFamily: FONT }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = MAROON; e.currentTarget.style.color = MAROON; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#374151"; }}
            >Cancel</button>
            <button
              onClick={applyColor}
              style={{ padding: "5px 12px", fontSize: 12, background: MAROON, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontFamily: FONT }}
            >Apply</button>
          </div>
        </div>
      )}

      {menuTab === "move" && (
        <div style={{ padding: "4px 0" }}>
          {MOVE_ITEMS.map(item => (
            <button
              key={item.dir}
              onClick={() => { onMove(item.dir); closeMenu(); }}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 16px", fontSize: 13, color: "#374151", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: FONT, minHeight: 44 }}
              onMouseEnter={e => { e.currentTarget.style.background = "#fdf8f8"; e.currentTarget.style.color = MAROON; }}
              onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#374151"; }}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: "center", color: "#9ca3af" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  ) : null;

  const bannerH = isBottom ? 68 : 80;

  return (
    <div
      style={{
        background: "#fff", border: "1px solid #e5e7eb",
        borderRadius: 12, overflow: "visible", display: "flex",
        flexDirection: "column", boxShadow: "0 1px 4px rgba(0,0,0,.06)",
        fontFamily: FONT, transition: "box-shadow 0.15s, transform 0.15s",
        position: "relative", minWidth: 0,
      }}
      onMouseEnter={e => {
        if (!menuOpen) {
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(123,17,19,.10)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={e => {
        if (!menuOpen) {
          e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.06)";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      {/* Banner */}
      <div
        style={{ position: "relative", height: bannerH, backgroundColor: course.color, cursor: "pointer", borderRadius: "12px 12px 0 0", overflow: "hidden" }}
        onClick={onClick}
      >
        {course.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.image} alt={course.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        <button
          ref={triggerRef}
          data-user-trigger="true"
          onClick={openMenu}
          style={{
            position: "absolute", top: 5, right: 5,
            background: menuOpen ? "rgba(255,255,255,0.25)" : "none",
            border: menuOpen ? "1px solid rgba(255,255,255,0.4)" : "none",
            borderRadius: "50%", cursor: "pointer",
            color: "rgba(255,255,255,0.9)", padding: 4, display: "flex", zIndex: 1,
            minWidth: 30, minHeight: 30, alignItems: "center", justifyContent: "center",
          }}
        >
          <MoreVertical size={15} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: isBottom ? "7px 9px 3px" : "8px 10px 4px", cursor: "pointer", flex: 1 }} onClick={onClick}>
        <p style={{ fontSize: isBottom ? 11 : 12, fontWeight: 800, color: course.color, lineHeight: 1.3, margin: 0, wordBreak: "break-word" }}>
          {course.name}
        </p>
        <p style={{ fontSize: 10, color: "#9ca3af", margin: "2px 0 0", fontWeight: 600 }}>{course.code}</p>
        {course.term && (
          <p style={{ fontSize: 10, color: "#c4b5b5", margin: "2px 0 0", fontWeight: 600 }}>{course.term}</p>
        )}
        {course._count !== undefined && (
          <p style={{ fontSize: 10, color: "#b0b7c3", margin: "3px 0 0", fontWeight: 500, display: "flex", alignItems: "center", gap: 3 }}>
            <Users size={9} /> {course._count.enrollments}
          </p>
        )}
      </div>

      {/* Bottom icons — hidden on bottom-nav */}
      {!isBottom && (
        <div style={{ display: "flex", alignItems: "center", gap: 1, padding: "5px 6px 8px", borderTop: "1px solid #f5f5f5", marginTop: "auto" }}>
          {iconBtn("Assignments", onAssignments,
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
          )}
          {iconBtn("Discussions", onDiscussions,
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          )}
          {iconBtn("Files", onFiles,
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          )}
        </div>
      )}

      {dropdown}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const router   = useRouter();
  const isBottom = useIsBottomNav();

  const [courses,  setCourses]  = useState<Course[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [order,    setOrder]    = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [, startTransition]     = useTransition();

  const [colAcademic,    setColAcademic]    = useState(false);
  const [colNonAcademic, setColNonAcademic] = useState(false);
  const [colUncat,       setColUncat]       = useState(false);
  const [colUnpublished, setColUnpublished] = useState(true);

  const fetchCourses = useCallback(() => {
    fetch(`/api/courses?t=${Date.now()}`)
      .then(r => r.json())
      .then(d => startTransition(() => {
        const list: Course[] = d.courses ?? [];
        setCourses(list);
        setOrder(prev => {
          const existing = prev.filter(id => list.some(c => c.id === id));
          const newIds   = list.filter(c => !prev.includes(c.id)).map(c => c.id);
          return [...existing, ...newIds];
        });
        setLoading(false);
      }))
      .catch(() => startTransition(() => setLoading(false)));
  }, [startTransition]);

  useEffect(() => {
    fetchCourses();
    const onVisibility = () => { if (document.visibilityState === "visible") fetchCourses(); };
    const onFocus      = () => fetchCourses();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    const interval = setInterval(fetchCourses, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, [fetchCourses]);

  const updateColor = async (id: string, color: string) => {
    startTransition(() => setCourses(prev => prev.map(c => c.id === id ? { ...c, color } : c)));
  };

  const moveCourse = (id: string, direction: "top" | "up" | "down" | "bottom", groupKey: string) => {
    setOrder(prev => {
      const groupIds = prev.filter(oid => {
        const c = courses.find(x => x.id === oid);
        if (!c) return false;
        if (groupKey === "unpublished")  return c.status === "UNPUBLISHED";
        if (groupKey === "academic")     return c.status === "PUBLISHED" && c.term === "Academic";
        if (groupKey === "nonacademic")  return c.status === "PUBLISHED" && c.term === "Non-Academic";
        return c.status === "PUBLISHED" && c.term !== "Academic" && c.term !== "Non-Academic";
      });
      const idx = groupIds.indexOf(id);
      if (idx === -1) return prev;
      const newGroup = [...groupIds];
      if (direction === "top")                               { newGroup.splice(idx, 1); newGroup.unshift(id); }
      if (direction === "up"     && idx > 0)                 { [newGroup[idx - 1], newGroup[idx]] = [newGroup[idx], newGroup[idx - 1]]; }
      if (direction === "down"   && idx < newGroup.length-1) { [newGroup[idx], newGroup[idx + 1]] = [newGroup[idx + 1], newGroup[idx]]; }
      if (direction === "bottom")                            { newGroup.splice(idx, 1); newGroup.push(id); }
      const otherIds = prev.filter(oid => !groupIds.includes(oid));
      const result: string[] = []; let gi = 0, oi = 0;
      prev.forEach(oid => {
        if (groupIds.includes(oid)) result.push(newGroup[gi++]);
        else result.push(otherIds[oi++]);
      });
      return result;
    });
  };

  const sorted        = [...courses].sort((a, b) => { const ai = order.indexOf(a.id), bi = order.indexOf(b.id); return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi); });
  const published     = sorted.filter(c => c.status === "PUBLISHED");
  const unpublished   = sorted.filter(c => c.status === "UNPUBLISHED");
  const academic      = published.filter(c => c.term === "Academic");
  const nonAcademic   = published.filter(c => c.term === "Non-Academic");
  const uncategorized = published.filter(c => c.term !== "Academic" && c.term !== "Non-Academic");

  // ── Grid: 2 cols on mobile, fluid auto-fill on desktop ──────────────────────
  const gridStyle: React.CSSProperties = {
    display: "grid",
    gap: isBottom ? 8 : 10,
    gridTemplateColumns: isBottom ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(170px, 1fr))",
  };

  const cardProps = (c: Course, groupKey: string) => ({
    course: c, isBottom,
    onColorChange: (color: string) => updateColor(c.id, color),
    onMove: (dir: "top" | "up" | "down" | "bottom") => moveCourse(c.id, dir, groupKey),
    onClick:       () => router.push(`/courses/${c.id}`),
    onAssignments: () => router.push(`/courses/${c.id}/assignments`),
    onDiscussions: () => router.push(`/courses/${c.id}/discussions`),
    onFiles:       () => router.push(`/courses/${c.id}/files`),
  });

  const renderGrid = (list: Course[], groupKey: string) => (
    <div style={{ ...gridStyle, paddingBottom: 12 }}>
      {list.map(c => <CourseCard key={c.id} {...cardProps(c, groupKey)} />)}
    </div>
  );

  const renderList = (list: Course[], groupKey: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 12 }}>
      {list.map(c => (
        <CourseListRow
          key={c.id} course={c} isBottom={isBottom}
          onClick={() => router.push(`/courses/${c.id}`)}
          onAssignments={() => router.push(`/courses/${c.id}/assignments`)}
          onDiscussions={() => router.push(`/courses/${c.id}/discussions`)}
          onFiles={() => router.push(`/courses/${c.id}/files`)}
        />
      ))}
    </div>
  );

  const renderSection = (list: Course[], groupKey: string) =>
    viewMode === "grid" ? renderGrid(list, groupKey) : renderList(list, groupKey);

  const px             = isBottom ? "12px" : "14px";
  // Extra bottom padding on mobile to clear the fixed bottom nav bar (~64px)
  const contentPadding = isBottom ? `10px 12px 84px` : "12px 10px 24px";

  return (
    <div style={{ ...font, minHeight: "100vh", background: "#f8f8f7" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        button { touch-action: manipulation; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>

      {/* ── Page Header ── */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #f0e4e4",
        padding: `${isBottom ? "10px" : "12px"} ${px}`,
        display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 8,
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.2em", margin: 0 }}>
            Dashboard
          </p>
          <h1 style={{ fontSize: isBottom ? 16 : 17, fontWeight: 900, color: "#111827", margin: "2px 0 0" }}>
            My Courses
          </h1>
        </div>

        {/* View toggle */}
        <div style={{ display: "flex", gap: 2, background: "#f3f4f6", borderRadius: 10, padding: 3 }}>
          {(["grid", "list"] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: isBottom ? "7px 10px" : "6px 10px",
                borderRadius: 8, border: "none", cursor: "pointer",
                fontFamily: FONT, fontSize: 11, fontWeight: 700, transition: "all 0.15s",
                background: viewMode === mode ? "#fff" : "none",
                color:      viewMode === mode ? "#111827" : "#9ca3af",
                boxShadow:  viewMode === mode ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                minHeight: 36, minWidth: 36,
              }}
              title={mode === "grid" ? "Grid" : "List"}
            >
              {mode === "grid" ? <LayoutGrid size={14} /> : <List size={14} />}
              {/* Text label only on side-nav */}
              {!isBottom && <span>{mode === "grid" ? "Grid" : "List"}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stat bar ── */}
      {!loading && courses.length > 0 && (
        <div style={{
          background: "#fff", borderBottom: "1px solid #f3f4f6",
          padding: `10px ${px}`,
          overflowX: "auto", WebkitOverflowScrolling: "touch",
        }}>
          <div style={{ display: "flex", gap: isBottom ? 18 : 20, minWidth: "max-content" }}>
            {[
              { label: "Total",        value: courses.length },
              { label: "Published",    value: published.length,    color: "#15803d" },
              { label: "Academic",     value: academic.length },
              { label: "Non-Academic", value: nonAcademic.length },
              { label: "Unpublished",  value: unpublished.length,  color: "#9ca3af" },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
                <span style={{ fontSize: isBottom ? 17 : 18, fontWeight: 900, color: s.color ?? MAROON, lineHeight: 1 }}>
                  {s.value}
                </span>
                <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, marginTop: 2, whiteSpace: "nowrap" }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div style={{ padding: contentPadding }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 10 }}>
            <div style={{ width: 20, height: 20, border: `2px solid #f0e4e4`, borderTop: `2px solid ${MAROON}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Loading courses...</p>
          </div>
        ) : courses.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef2f2", border: `1px solid #f0e4e4`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={24} color={MAROON} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#374151", margin: 0 }}>No courses yet</p>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: 0, textAlign: "center" }}>
              Your courses will appear here once they&apos;re assigned to you.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

            {/* ── Published ── */}
            {published.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f0e4e4", overflow: "hidden" }}>
                <div style={{ padding: `12px ${px} 0` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: MAROON, textTransform: "uppercase", letterSpacing: "0.12em" }}>Published</span>
                    <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>({published.length})</span>
                  </div>
                </div>
                <div style={{ padding: `2px ${px} 14px`, display: "flex", flexDirection: "column", gap: 0 }}>

                  {academic.length > 0 && (
                    <div style={{ marginBottom: 4 }}>
                      <SectionHeader
                        count={academic.length} collapsed={colAcademic}
                        onToggle={() => setColAcademic(v => !v)}
                        badge={
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#eff6ff", color: "#1565c0", border: "1px solid #bfdbfe", borderRadius: 20, padding: "3px 10px 3px 8px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT, whiteSpace: "nowrap" }}>
                            <GraduationCap size={12} /> Academic
                          </span>
                        }
                      />
                      {!colAcademic && renderSection(academic, "academic")}
                    </div>
                  )}

                  {nonAcademic.length > 0 && (
                    <div style={{ marginBottom: 4 }}>
                      <SectionHeader
                        count={nonAcademic.length} collapsed={colNonAcademic}
                        onToggle={() => setColNonAcademic(v => !v)}
                        badge={
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", borderRadius: 20, padding: "3px 10px 3px 8px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT, whiteSpace: "nowrap" }}>
                            <Briefcase size={12} /> Non-Academic
                          </span>
                        }
                      />
                      {!colNonAcademic && renderSection(nonAcademic, "nonacademic")}
                    </div>
                  )}

                  {uncategorized.length > 0 && (
                    <div style={{ marginBottom: 4 }}>
                      <SectionHeader
                        count={uncategorized.length} collapsed={colUncat}
                        onToggle={() => setColUncat(v => !v)}
                        badge={
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#f9fafb", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: 20, padding: "3px 10px 3px 8px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: FONT, whiteSpace: "nowrap" }}>
                            <BookOpen size={12} /> Uncategorized
                          </span>
                        }
                      />
                      {!colUncat && renderSection(uncategorized, "uncategorized")}
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* ── Unpublished ── */}
            {unpublished.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f3f4f6", overflow: "hidden" }}>
                <div style={{ padding: `12px ${px} 0` }}>
                  <SectionHeader
                    count={unpublished.length} collapsed={colUnpublished}
                    onToggle={() => setColUnpublished(v => !v)}
                    badge={
                      <span style={{ fontSize: 11, fontWeight: 900, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: FONT }}>
                        Unpublished
                      </span>
                    }
                  />
                </div>
                {!colUnpublished && (
                  <div style={{ padding: `0 ${px} 14px` }}>
                    {renderSection(unpublished, "unpublished")}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}