"use client";

// src/components/layout/courses-panel.tsx

import { useState, createContext, useContext, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, BookOpen } from "lucide-react";
import GroupHomePage from "./GroupHomePage";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface CourseRow {
  id: string;
  name: string;
  code: string;
  color: string;
  status: "PUBLISHED" | "UNPUBLISHED";
  term: string | null;
}

// ── Context ────────────────────────────────────────────────────────────────────
interface CoursesContextType {
  isOpen: boolean;
  isActive: boolean;
  open: () => void;
  close: () => void;
  closePanel: () => void;
}

const CoursesContext = createContext<CoursesContextType>({
  isOpen: false,
  isActive: false,
  open: () => {},
  close: () => {},
  closePanel: () => {},
});

export function CoursesProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const open = () => { setIsOpen(true); setIsActive(true); };
  const close = () => { setIsOpen(false); setIsActive(false); };
  const closePanel = () => { setIsOpen(false); };

  return (
    <CoursesContext.Provider value={{ isOpen, isActive, open, close, closePanel }}>
      {children}
    </CoursesContext.Provider>
  );
}

export function useCourses() {
  return useContext(CoursesContext);
}

// ── View state ─────────────────────────────────────────────────────────────────
type GroupView = {
  type: "group";
  name: string;
  courseName: string;
  courseId: string;
  groupId: string;
};

type View = "panel" | "allCourses" | GroupView;

// ── Shared Styling ─────────────────────────────────────────────────────────────
const FONT = "\'Plus Jakarta Sans\', \'Helvetica Neue\', Arial, sans-serif";

const COLORS = {
  primary: "#7b1113",
  primaryHover: "#5a0d0f",
  white: "#fff",
  bg: "#fdf8f8",
  border: "#e8d5d5",
  text: "#111827",
  textSecondary: "#9ca3af",
  textMuted: "#6b7280",
  success: "#15803d",
  warning: "#c2410c",
};

// ── Nav position detection ─────────────────────────────────────────────────────
// Detects whether the icon/nav bar is at the bottom or on the side.
// Strategy: look for a known bottom-nav selector; fall back to aspect ratio.
// You can customize NAV_BOTTOM_SELECTOR to match your actual bottom nav element.
const NAV_BOTTOM_SELECTOR = "[data-nav-position=\"bottom\"], nav[data-bottom], .bottom-nav, [data-testid=\"bottom-nav\"]";

function useNavPosition(): "bottom" | "side" {
  const detect = (): "bottom" | "side" => {
    if (typeof window === "undefined") return "side";
    // Check DOM for a bottom nav element
    const el = document.querySelector(NAV_BOTTOM_SELECTOR);
    if (el) {
      const rect = el.getBoundingClientRect();
      // If the element exists and its top is in the lower 20% of the screen, it's a bottom nav
      if (rect.top > window.innerHeight * 0.75) return "bottom";
    }
    // Fallback: portrait orientation or narrow viewport → bottom nav
    if (window.innerWidth < window.innerHeight || window.innerWidth < 768) return "bottom";
    return "side";
  };

  const [pos, setPos] = useState<"bottom" | "side">(detect);

  useEffect(() => {
    const update = () => setPos(detect());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return pos;
}

// ── SIDEBAR_WIDTH: width of the side icon bar when nav is on the side ──────────
const SIDEBAR_WIDTH = 64;

// ── All Offices Full Screen ────────────────────────────────────────────────────
function AllCoursesFullScreen({
  courses,
  onCourseClick,
  navPosition,
}: {
  courses: CourseRow[];
  onCourseClick: (c: CourseRow) => void;
  navPosition: "bottom" | "side";
}) {
  const isBottom = navPosition === "bottom";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: COLORS.white,
        fontFamily: FONT,
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", padding: isBottom ? "16px 20px 12px" : "20px 32px 16px" }}>
        <h1
          style={{
            fontSize: isBottom ? 18 : 22,
            fontWeight: 800,
            color: COLORS.text,
            margin: 0,
          }}
        >
          All Offices
        </h1>
      </div>

      <div style={{ flex: 1, padding: isBottom ? "0 16px 80px" : "0 32px 48px" }}>
        {courses.length === 0 ? (
          <p style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 60, textAlign: "center" }}>
            No offices assigned yet.
          </p>
        ) : isBottom ? (
          /* ── Mobile / bottom-nav: card list ── */
          <div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: COLORS.primary,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                margin: "0 0 10px",
              }}
            >
              Offices
            </p>
            <div style={{ border: `1px solid #ede8e8`, borderRadius: 12, overflow: "hidden" }}>
              {courses.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => onCourseClick(c)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: COLORS.white,
                    border: "none",
                    borderTop: i === 0 ? "none" : `1px solid #f3f4f6`,
                    borderLeft: `4px solid ${c.color}`,
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                    fontFamily: FONT,
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.bg; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = COLORS.white; }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: c.color,
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.name}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: COLORS.textMuted,
                        margin: "2px 0 0",
                        fontFamily: "monospace",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.code}
                    </p>
                    {c.term && (
                      <p style={{ fontSize: 11, color: COLORS.textSecondary, margin: "2px 0 0" }}>
                        {c.term}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {c.status === "PUBLISHED" ? (
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: COLORS.success,
                        background: "#f0fdf4", border: "1px solid #bbf7d0",
                        padding: "2px 8px", borderRadius: 20,
                      }}>
                        Live
                      </span>
                    ) : (
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: COLORS.textSecondary,
                        background: "#f9fafb", border: "1px solid #e5e7eb",
                        padding: "2px 8px", borderRadius: 20,
                      }}>
                        Draft
                      </span>
                    )}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Desktop / side-nav: table ── */
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
                {[["Office Name", ""], ["Code", "120px"], ["Term", "120px"], ["Status", "120px"]].map(([label, w]) => (
                  <th
                    key={label}
                    style={{
                      textAlign: "left", padding: "8px 0",
                      fontSize: 11, fontWeight: 700, color: COLORS.primary,
                      textTransform: "uppercase", letterSpacing: "0.08em",
                      width: w || undefined,
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {courses.map((c, i) => (
                <tr
                  key={c.id}
                  onClick={() => onCourseClick(c)}
                  style={{
                    background: i % 2 === 0 ? COLORS.white : COLORS.bg,
                    cursor: "pointer",
                    borderBottom: `1px solid #f3f4f6`,
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.bg; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? COLORS.white : COLORS.bg; }}
                >
                  <td style={{ padding: "10px 16px 10px 0", fontSize: 13 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 2, background: c.color, flexShrink: 0, display: "inline-block" }} />
                      <span style={{ color: c.color, fontWeight: 600 }}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 16px 10px 0", fontSize: 12, color: COLORS.textMuted, fontFamily: "monospace" }}>{c.code}</td>
                  <td style={{ padding: "10px 16px 10px 0", fontSize: 12, color: COLORS.textSecondary }}>{c.term ?? "—"}</td>
                  <td style={{ padding: "10px 0", fontSize: 12 }}>
                    {c.status === "PUBLISHED"
                      ? <span style={{ color: COLORS.success, fontWeight: 600 }}>Published</span>
                      : <span style={{ color: COLORS.warning, fontWeight: 600 }}>Unpublished</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Course Item Component ──────────────────────────────────────────────────────
function CourseItem({ c, onClick }: { c: CourseRow; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        display: "block", width: "100%", textAlign: "left",
        background: hovered ? COLORS.bg : "none",
        border: "none", borderBottom: `1px solid #f3f4f6`,
        cursor: "pointer", padding: "7px 4px", borderRadius: 4,
        fontFamily: FONT, transition: "background 0.1s",
      }}
    >
      <p style={{ fontSize: 13, color: c.color, fontWeight: 600, margin: 0, lineHeight: 1.35 }}>{c.name}</p>
      <p style={{ fontSize: 11, color: COLORS.textSecondary, margin: "1px 0 0", fontWeight: 500 }}>{c.code}</p>
    </button>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────────
export default function CoursesPanel() {
  const { isOpen, isActive, close, closePanel } = useCourses();
  const router = useRouter();
  const navPosition = useNavPosition();
  const isBottom = navPosition === "bottom";

  const [view, setView] = useState<View>("panel");
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;
    startTransition(() => setLoading(true));
    fetch("/api/courses")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) startTransition(() => { setCourses(d.courses ?? []); setLoading(false); });
      })
      .catch(() => {
        if (!cancelled) startTransition(() => { setCourses([]); setLoading(false); });
      });
    return () => { cancelled = true; };
  }, [isActive]);

  if (!isActive) return null;

  const isFullScreen = view === "allCourses" || (typeof view === "object" && "type" in view);

  const handleXClose = () => {
    if (isFullScreen) { setView("panel"); close(); }
    else close();
  };

  const goFullScreen = () => { setView("allCourses"); closePanel(); };
  const handleBack = () => { setView("panel"); close(); };

  const handleGroupOpen = (groupName: string, courseName: string, courseId: string, groupId: string) => {
    setView({ type: "group", name: groupName, courseName, courseId, groupId });
    closePanel();
  };
  void handleGroupOpen;

  const published = courses.filter((c) => c.status === "PUBLISHED");
  const unpublished = courses.filter((c) => c.status === "UNPUBLISHED");

  // ── Layout values based on nav position ────────────────────────────────────
  // Side nav → panel slides in from the left (next to the sidebar)
  // Bottom nav → panel slides up from the bottom as a half-sheet
  const panelStyle: React.CSSProperties = isBottom
    ? {
        // Bottom sheet
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "75vh",
        borderRadius: "16px 16px 0 0",
        borderTop: `1px solid ${COLORS.border}`,
        zIndex: isFullScreen ? 120 : 110,
      }
    : {
        // Side panel
        position: "fixed",
        top: 0,
        left: SIDEBAR_WIDTH,
        height: "100%",
        width: 288,
        borderRight: `1px solid ${COLORS.border}`,
        zIndex: isFullScreen ? 120 : 110,
      };

  const fullScreenStyle: React.CSSProperties = isBottom
    ? {
        position: "fixed",
        inset: 0,
        bottom: 0,
        zIndex: 100,
      }
    : {
        position: "fixed",
        inset: 0,
        left: SIDEBAR_WIDTH,
        zIndex: 100,
      };

  return (
    <>
      {/* Full screen overlay */}
      {isFullScreen && (
        <div style={{ ...fullScreenStyle, background: COLORS.white }}>
          {view === "allCourses" && (
            <AllCoursesFullScreen
              courses={courses}
              navPosition={navPosition}
              onCourseClick={(c) => { close(); router.push(`/courses/${c.id}`); }}
            />
          )}
          {typeof view === "object" && "type" in view && view.type === "group" && (
            <GroupHomePage
              groupName={view.name}
              parentName={view.courseName}
              onBack={handleBack}
              courseId={view.courseId}
              groupId={view.groupId}
            />
          )}
        </div>
      )}

      {/* Panel */}
      {isOpen && (
        <>
          {/* Backdrop (bottom nav only) */}
          {isBottom && (
            <div
              onClick={handleXClose}
              style={{
                position: "fixed", inset: 0,
                background: "rgba(0,0,0,0.25)",
                zIndex: 109,
              }}
            />
          )}

          <div
            style={{
              ...panelStyle,
              background: COLORS.white,
              boxShadow: isBottom
                ? "0 -4px 24px rgba(123,17,19,0.10)"
                : "2px 0 10px rgba(123,17,19,0.06)",
              display: "flex",
              flexDirection: "column",
              fontFamily: FONT,
            }}
          >
            {/* Drag handle (bottom nav only) */}
            {isBottom && (
              <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px", flexShrink: 0 }}>
                <div style={{ width: 40, height: 4, borderRadius: 99, background: "#e5e7eb" }} />
              </div>
            )}

            {/* Header */}
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: isBottom ? "10px 16px" : "14px 16px 12px",
                borderBottom: `1px solid #f0e4e4`, flexShrink: 0,
              }}
            >
              <h1 style={{ fontSize: 15, fontWeight: 800, color: COLORS.text, margin: 0 }}>Offices</h1>
              <button
                onClick={handleXClose}
                style={{
                  width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
                  border: `1px solid #e5e7eb`, borderRadius: 6, background: "none",
                  cursor: "pointer", color: COLORS.textSecondary, transition: "all 0.12s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = COLORS.primary; e.currentTarget.style.color = COLORS.primary; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = COLORS.textSecondary; }}
              >
                <X size={12} />
              </button>
            </div>

            {/* All Offices link */}
            <div style={{ padding: "10px 16px", borderBottom: `1px solid #f0e4e4`, flexShrink: 0 }}>
              <button
                onClick={goFullScreen}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  fontSize: 13, fontWeight: 700, color: COLORS.primary, fontFamily: FONT,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
              >
                All Offices
              </button>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: COLORS.border, margin: "0 16px", flexShrink: 0 }} />

            {/* Course list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
              {loading ? (
                <p style={{ fontSize: 13, color: COLORS.textSecondary }}>Loading...</p>
              ) : courses.length === 0 ? (
                <p style={{ fontSize: 13, color: COLORS.textSecondary }}>No offices assigned yet.</p>
              ) : (
                <>
                  {published.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{
                        fontSize: 10, fontWeight: 800, color: COLORS.text,
                        textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 6px",
                      }}>
                        Published Offices
                      </p>
                      {published.map((c) => (
                        <CourseItem key={c.id} c={c} onClick={() => { close(); router.push(`/courses/${c.id}`); }} />
                      ))}
                    </div>
                  )}
                  {unpublished.length > 0 && (
                    <div>
                      <p style={{
                        fontSize: 10, fontWeight: 800, color: COLORS.textSecondary,
                        textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 6px",
                      }}>
                        Unpublished Offices
                      </p>
                      {unpublished.map((c) => (
                        <CourseItem key={c.id} c={c} onClick={() => { close(); router.push(`/courses/${c.id}`); }} />
                      ))}
                    </div>
                  )}
                </>
              )}
              {!loading && courses.length > 0 && (
                <p style={{
                  fontSize: 11, color: COLORS.textSecondary, lineHeight: 1.6,
                  marginTop: 20, paddingTop: 12, borderTop: "1px solid #f3f4f6",
                }}>
                  Click on an office to view more details and manage office content.
                </p>
              )}
            </div>

            {/* Bottom nav shortcut — "View All" button */}
            {isBottom && (
              <div style={{ padding: "12px 16px", borderTop: "1px solid #f3f4f6", flexShrink: 0 }}>
                <button
                  onClick={goFullScreen}
                  style={{
                    width: "100%", height: 40, background: COLORS.primary,
                    border: "none", borderRadius: 12, color: COLORS.white,
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    gap: 8, fontFamily: FONT, transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.primaryHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = COLORS.primary; }}
                >
                  <BookOpen size={15} />
                  View All Offices
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}