"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Course {
  id:        string;
  name:      string;
  code:      string;
  color:     string;
  image:     string | null;  // ← added
  status:    "PUBLISHED" | "UNPUBLISHED";
  term:      string | null;
  startDate?: string | null;
  endDate?:   string | null;
}

const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";
const font: React.CSSProperties = { fontFamily: FONT };

const PRESET_COLORS = [
  "#e91e8c","#d41e00","#e66000","#f5a623",
  "#6d9b00","#2d7a2d","#00695c","#0770a2",
  "#1565c0","#4527a0","#6a0dad","#7b1113",
  "#37474f","#546e7a","#78909c","#5d4037",
];

// ── Icons ──────────────────────────────────────────────────────────────────────
function AssignmentIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="9" y1="9" x2="15" y2="9"/>
      <line x1="9" y1="13" x2="15" y2="13"/>
      <line x1="9" y1="17" x2="13" y2="17"/>
    </svg>
  );
}
function DiscussionIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function FilesIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  );
}
function MoreVertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5"  r="1.2" fill="currentColor"/>
      <circle cx="12" cy="12" r="1.2" fill="currentColor"/>
      <circle cx="12" cy="19" r="1.2" fill="currentColor"/>
    </svg>
  );
}

// ── Course Card ────────────────────────────────────────────────────────────────
function CourseCard({
  course, onColorChange, onMove, onClick,
  onAssignments, onDiscussions, onFiles,
}: {
  course:        Course;
  onColorChange: (color: string) => void;
  onMove:        (dir: "top" | "up" | "down" | "bottom") => void;
  onClick:       () => void;
  onAssignments: () => void;
  onDiscussions: () => void;
  onFiles:       () => void;
}) {
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [menuTab,   setMenuTab]   = useState<"color" | "move">("color");
  const [hexInput,  setHexInput]  = useState(course.color);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [, startTransition]       = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Sync hex when course color changes externally
  useEffect(() => { startTransition(() => setHexInput(course.color)); }, [course.color]);

  // Position dropdown
  useEffect(() => {
    if (!menuOpen || !triggerRef.current) return;
    const r     = triggerRef.current.getBoundingClientRect();
    const menuW = 230;
    const menuH = 280;
    const vh    = window.innerHeight;
    const left  = Math.max(72, r.right - menuW);
    const spaceBelow = vh - r.bottom - 8;
    const top   = spaceBelow >= menuH ? r.bottom + 4 : r.top - menuH - 4;
    setMenuStyle({ top, left, width: menuW });
  }, [menuOpen]);

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-staff-menu]") && !t.closest("[data-staff-trigger]")) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuTab("color");
    setHexInput(course.color);
    setMenuOpen((v) => !v);
  };

  const closeMenu = () => setMenuOpen(false);

  const applyColor = (e: React.MouseEvent) => {
    e.stopPropagation();
    onColorChange(hexInput.startsWith("#") ? hexInput : `#${hexInput}`);
    closeMenu();
  };

  const iconBtn = (title: string, cb: () => void, svg: React.ReactNode) => (
    <button
      onClick={(e) => { e.stopPropagation(); cb(); }}
      title={title}
      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#d1d5db", display: "flex", lineHeight: 1, transition: "color .15s" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = MAROON)}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#d1d5db")}
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

  const dropdown = menuOpen
    ? createPortal(
        <div
          data-staff-menu="true"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed", zIndex: 99999, background: "#fff",
            border: "1px solid #f0e4e4", borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
            overflow: "hidden", fontFamily: FONT, ...menuStyle,
          }}
        >
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #f0e4e4", background: "#fdf8f8" }}>
            <button style={tabStyle("color")} onClick={() => setMenuTab("color")}>Color</button>
            <button style={tabStyle("move")}  onClick={() => setMenuTab("move")}>Move</button>
            <button onClick={closeMenu}
              style={{ padding: "8px 10px", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, fontFamily: FONT }}>
              ✕
            </button>
          </div>

          {/* Color tab */}
          {menuTab === "color" && (
            <div style={{ padding: "12px 14px" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Nickname</p>
              <input value={course.name} readOnly
                style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 6, padding: "5px 8px", fontSize: 12, color: "#374151", marginBottom: 10, boxSizing: "border-box", background: "#f9fafb", fontFamily: FONT }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 4, marginBottom: 10 }}>
                {PRESET_COLORS.map((c) => (
                  <button key={c} onClick={() => { onColorChange(c); setHexInput(c); closeMenu(); }}
                    style={{ width: 22, height: 22, borderRadius: 4, background: c, padding: 0, cursor: "pointer", border: c === course.color ? `3px solid ${MAROON}` : "2px solid transparent", outline: c === course.color ? "2px solid #fff" : "none", outlineOffset: -3, transition: "transform 0.1s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")} />
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: 4, background: hexInput, border: "1px solid #e5e7eb", flexShrink: 0 }} />
                <input value={hexInput} onChange={(e) => setHexInput(e.target.value)}
                  style={{ flex: 1, border: "1px solid #e5e7eb", borderRadius: 6, padding: "5px 8px", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = MAROON)}
                  onBlur={(e)  => (e.currentTarget.style.borderColor = "#e5e7eb")}
                  onKeyDown={(e) => e.key === "Enter" && applyColor(e as unknown as React.MouseEvent)} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                <button onClick={closeMenu}
                  style={{ padding: "5px 12px", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#374151", fontFamily: FONT }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = MAROON; e.currentTarget.style.color = MAROON; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#374151"; }}>
                  Cancel
                </button>
                <button onClick={applyColor}
                  style={{ padding: "5px 12px", fontSize: 12, background: MAROON, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontFamily: FONT }}>
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* Move tab */}
          {menuTab === "move" && (
            <div style={{ padding: "4px 0" }}>
              {MOVE_ITEMS.map((item) => (
                <button key={item.dir} onClick={() => { onMove(item.dir); closeMenu(); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 16px", fontSize: 13, color: "#374151", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: FONT }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#fdf8f8"; e.currentTarget.style.color = MAROON; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none";    e.currentTarget.style.color = "#374151"; }}>
                  <span style={{ fontSize: 16, width: 20, textAlign: "center", color: "#9ca3af" }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <div
      style={{
        width: 178, background: "#fff", border: "1px solid #e5e7eb",
        borderRadius: 12, overflow: "visible", display: "flex",
        flexDirection: "column", boxShadow: "0 1px 4px rgba(0,0,0,.06)",
        fontFamily: FONT, transition: "box-shadow 0.15s, transform 0.15s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (!menuOpen) {
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(123,17,19,.10)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!menuOpen) {
          e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.06)";
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      {/* Banner — color + image overlay */}
      <div
        style={{
          position: "relative", height: 96,
          backgroundColor: course.color,
          cursor: "pointer", borderRadius: "12px 12px 0 0", overflow: "hidden",
        }}
        onClick={onClick}
      >
        {/* ── Course image — shows admin-uploaded image ── */}
        {course.image && (
          <img
            src={course.image}
            alt={course.name}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            // Add cache-busting so updated images always re-fetch
            key={course.image}
          />
        )}
        <button
          ref={triggerRef}
          data-staff-trigger="true"
          onClick={openMenu}
          style={{
            position: "absolute", top: 6, right: 6,
            background: menuOpen ? "rgba(255,255,255,0.25)" : "none",
            border: menuOpen ? "1px solid rgba(255,255,255,0.4)" : "none",
            borderRadius: "50%", cursor: "pointer",
            color: "rgba(255,255,255,0.9)", padding: 3, display: "flex", zIndex: 1,
          }}
        >
          <MoreVertIcon />
        </button>
      </div>

      {/* Card body */}
      <div style={{ padding: "10px 12px 6px", cursor: "pointer" }} onClick={onClick}>
        <p style={{ fontSize: 13, fontWeight: 800, color: course.color, lineHeight: 1.3, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {course.name}
        </p>
        <p style={{ fontSize: 11, color: "#9ca3af", margin: "3px 0 0", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {course.code}
        </p>
        {course.term && (
          <p style={{ fontSize: 10, color: "#c4b5b5", margin: "2px 0 0", fontWeight: 600 }}>{course.term}</p>
        )}
      </div>

      {/* Bottom icons */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px 12px" }}>
        {iconBtn("Assignments", onAssignments, <AssignmentIcon />)}
        {iconBtn("Discussions", onDiscussions, <DiscussionIcon />)}
        {iconBtn("Files",       onFiles,       <FilesIcon />)}
      </div>

      {dropdown}
    </div>
  );
}

// ── Section Heading ────────────────────────────────────────────────────────────
function SectionHeading({ title, count, color }: { title: string; count: number; color: string }) {
  return (
    <h2 style={{
      fontSize: 13, fontWeight: 800, color, textTransform: "uppercase",
      letterSpacing: "0.08em",
      borderBottom: `2px solid ${color === MAROON ? "#f0e4e4" : "#f3f4f6"}`,
      paddingBottom: 8, marginBottom: 18, marginTop: 0, fontFamily: FONT,
    }}>
      {title} ({count})
    </h2>
  );
}

// ── Coming Up Sidebar ──────────────────────────────────────────────────────────
function Sidebar() {
  return (
    <div style={{ width: 220, borderLeft: "1px solid #f0e4e4", flexShrink: 0, overflowY: "auto", fontFamily: FONT }}>
      {/* Coming Up */}
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #f9fafb" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>Coming Up</p>
          <Link
            href="/calendar"
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: MAROON, textDecoration: "none", fontWeight: 600 }}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.textDecoration = "none")}
          >
            <CalendarIcon /> View Calendar
          </Link>
        </div>
        <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>Nothing for the next week</p>
      </div>

      {/* Recent Feedback */}
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #f9fafb" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>Recent Feedback</p>
        <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>Nothing for now</p>
      </div>

      {/* View Grades */}
      <div style={{ padding: "14px 16px" }}>
        <button
          style={{ width: "100%", textAlign: "left", padding: "8px 12px", background: "#fdf8f8", border: `1px solid #f0e4e4`, borderRadius: 8, fontSize: 13, color: "#374151", cursor: "pointer", fontFamily: FONT, transition: "all .15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#f0e4e4"; e.currentTarget.style.color = MAROON; e.currentTarget.style.borderColor = MAROON; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#fdf8f8"; e.currentTarget.style.color = "#374151"; e.currentTarget.style.borderColor = "#f0e4e4"; }}
        >
          View Grades
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [order,   setOrder]   = useState<string[]>([]);
  const [, startTransition]   = useTransition();

  // ── Fetch courses ────────────────────────────────────────────────────────────
  const fetchCourses = () => {
    // Add cache-busting timestamp so browser always fetches fresh data
    fetch(`/api/courses?t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) =>
        startTransition(() => {
          const list: Course[] = d.courses ?? [];
          setCourses(list);
          setOrder((prev) => {
            const existing = prev.filter((id) => list.some((c) => c.id === id));
            const newIds   = list.filter((c) => !prev.includes(c.id)).map((c) => c.id);
            return [...existing, ...newIds];
          });
          setLoading(false);
        })
      )
      .catch(() => startTransition(() => setLoading(false)));
  };

  useEffect(() => {
    // Initial fetch
    fetchCourses();

    // Re-fetch when user comes back to this tab (admin may have changed image)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchCourses();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Re-fetch when window regains focus
    const handleFocus = () => fetchCourses();
    window.addEventListener("focus", handleFocus);

    // Poll every 60 seconds so image changes by admin are reflected
    const interval = setInterval(fetchCourses, 60_000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const updateColor = async (id: string, color: string) => {
    startTransition(() => setCourses((prev) => prev.map((c) => c.id === id ? { ...c, color } : c)));
  };

  const moveCourse = (id: string, direction: "top" | "up" | "down" | "bottom", status: "PUBLISHED" | "UNPUBLISHED") => {
    setOrder((prev) => {
      const groupIds = prev.filter((oid) => courses.find((c) => c.id === oid)?.status === status);
      const idx = groupIds.indexOf(id);
      if (idx === -1) return prev;
      const newGroup = [...groupIds];
      if (direction === "top")    { newGroup.splice(idx, 1); newGroup.unshift(id); }
      if (direction === "up"     && idx > 0)                 { [newGroup[idx - 1], newGroup[idx]] = [newGroup[idx], newGroup[idx - 1]]; }
      if (direction === "down"   && idx < newGroup.length - 1){ [newGroup[idx], newGroup[idx + 1]] = [newGroup[idx + 1], newGroup[idx]]; }
      if (direction === "bottom") { newGroup.splice(idx, 1); newGroup.push(id); }
      const otherIds = prev.filter((oid) => courses.find((c) => c.id === oid)?.status !== status);
      const result: string[] = [];
      let gi = 0, oi = 0;
      prev.forEach((oid) => {
        const c = courses.find((x) => x.id === oid);
        if (c?.status === status) result.push(newGroup[gi++]);
        else result.push(otherIds[oi++]);
      });
      return result;
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  const sortedCourses = [...courses].sort((a, b) => {
    const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const published     = sortedCourses.filter((c) => c.status === "PUBLISHED");
  const unpublished   = sortedCourses.filter((c) => c.status === "UNPUBLISHED");
  const academic      = published.filter((c) => c.term === "Academic");
  const nonAcademic   = published.filter((c) => c.term === "Non-Academic");
  const uncategorized = published.filter((c) => c.term !== "Academic" && c.term !== "Non-Academic");

  return (
    <div style={{ ...font, display: "flex", height: "100%", background: "#fff", overflow: "hidden" }}>

      {/* ── Main content ── */}
      <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingBottom: 12, borderBottom: "1px solid #f0e4e4" }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.2em", margin: 0 }}>Dashboard</p>
            <h1 style={{ fontSize: 18, fontWeight: 900, color: "#111827", margin: "2px 0 0" }}>Offices</h1>
          </div>
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "80px 0" }}>Loading...</p>
        ) : courses.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", gap: 10 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fdf8f8", border: `1px solid #f0e4e4`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={MAROON} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </div>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>No courses yet.</p>
            <p style={{ fontSize: 12, color: "#c4b5b5", margin: 0, textAlign: "center" }}>Your courses will appear here once they&apos;re assigned to you.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {published.length > 0 && (
              <section>
                {academic.length > 0 && (
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 8, borderBottom: "1px solid #eff6ff" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#eff6ff", color: "#1565c0", border: "1px solid #bfdbfe", borderRadius: 20, padding: "3px 10px 3px 8px", fontSize: 11, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.06em", fontFamily: FONT, whiteSpace: "nowrap" as const }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                        Academic
                      </span>
                      <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>({academic.length})</span>
                      <span style={{ flex: 1, height: 1, background: "#eff6ff" }}/>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                      {academic.map((c) => (
                        <CourseCard key={c.id} course={c}
                          onColorChange={(color) => updateColor(c.id, color)}
                          onMove={(dir) => moveCourse(c.id, dir, "PUBLISHED")}
                          onClick={() => router.push(`/courses/${c.id}`)}
                          onAssignments={() => router.push(`/courses/${c.id}/assignments`)}
                          onDiscussions={() => router.push(`/courses/${c.id}/discussions`)}
                          onFiles={() => router.push(`/courses/${c.id}/files`)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {nonAcademic.length > 0 && (
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 8, borderBottom: "1px solid #fffbeb" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", borderRadius: 20, padding: "3px 10px 3px 8px", fontSize: 11, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.06em", fontFamily: FONT, whiteSpace: "nowrap" as const }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                        Non-Academic
                      </span>
                      <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>({nonAcademic.length})</span>
                      <span style={{ flex: 1, height: 1, background: "#fffbeb" }}/>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                      {nonAcademic.map((c) => (
                        <CourseCard key={c.id} course={c}
                          onColorChange={(color) => updateColor(c.id, color)}
                          onMove={(dir) => moveCourse(c.id, dir, "PUBLISHED")}
                          onClick={() => router.push(`/courses/${c.id}`)}
                          onAssignments={() => router.push(`/courses/${c.id}/assignments`)}
                          onDiscussions={() => router.push(`/courses/${c.id}/discussions`)}
                          onFiles={() => router.push(`/courses/${c.id}/files`)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {uncategorized.length > 0 && (
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 8, borderBottom: "1px solid #f3f4f6" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#f9fafb", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: 20, padding: "3px 10px 3px 8px", fontSize: 11, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.06em", fontFamily: FONT, whiteSpace: "nowrap" as const }}>
                        Uncategorized
                      </span>
                      <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>({uncategorized.length})</span>
                      <span style={{ flex: 1, height: 1, background: "#f3f4f6" }}/>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                      {uncategorized.map((c) => (
                        <CourseCard key={c.id} course={c}
                          onColorChange={(color) => updateColor(c.id, color)}
                          onMove={(dir) => moveCourse(c.id, dir, "PUBLISHED")}
                          onClick={() => router.push(`/courses/${c.id}`)}
                          onAssignments={() => router.push(`/courses/${c.id}/assignments`)}
                          onDiscussions={() => router.push(`/courses/${c.id}/discussions`)}
                          onFiles={() => router.push(`/courses/${c.id}/files`)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {unpublished.length > 0 && (
              <section>
                <SectionHeading title="Unpublished Units" count={unpublished.length} color="#6b7280" />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                  {unpublished.map((c) => (
                    <CourseCard
                      key={c.id}
                      course={c}
                      onColorChange={(color) => updateColor(c.id, color)}
                      onMove={(dir) => moveCourse(c.id, dir, "PUBLISHED")}
                      onClick={() => router.push(`/courses/${c.id}`)}
                      onAssignments={() => router.push(`/courses/${c.id}/assignments`)}
                      onDiscussions={() => router.push(`/courses/${c.id}/discussions`)}
                      onFiles={() => router.push(`/courses/${c.id}/files`)}
                    />
                  ))}
                </div>
              </section>
            )}

            
          </div>
        )}
      </div>

      {/* ── Right sidebar ── */}
      
    </div>
  );
}