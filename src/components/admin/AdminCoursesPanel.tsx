"use client";

import { useState, createContext, useContext, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, BookOpen, Users, ChevronRight } from "lucide-react";

// ── Context ────────────────────────────────────────────────────────────────────
interface CoursesContextType {
  isOpen:     boolean;
  isActive:   boolean;
  view:       "panel" | "allCourses";
  setView:    (v: "panel" | "allCourses") => void;
  open:       () => void;
  openPanel:  () => void;
  close:      () => void;
  closePanel: () => void;
}

const AdminCoursesContext = createContext<CoursesContextType>({
  isOpen: false, isActive: false,
  view: "panel", setView: () => {},
  open: () => {}, openPanel: () => {}, close: () => {}, closePanel: () => {},
});

export function AdminCoursesProvider({ children }: { children: React.ReactNode }) {
  const [isOpen,   setIsOpen]   = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [view,     setView]     = useState<"panel" | "allCourses">("panel");

  const open       = () => { setView("panel"); setIsOpen(true);  setIsActive(true);  };
  const openPanel  = () => {                   setIsOpen(true);  setIsActive(true);  };
  const close      = () => { setIsOpen(false); setIsActive(false); setView("panel"); };
  const closePanel = () => { setIsOpen(false);                                       };

  return (
    <AdminCoursesContext.Provider value={{ isOpen, isActive, view, setView, open, openPanel, close, closePanel }}>
      {children}
    </AdminCoursesContext.Provider>
  );
}

export function useAdminCourses() { return useContext(AdminCoursesContext); }

// ── Types ──────────────────────────────────────────────────────────────────────
interface Course {
  id: string; name: string; code: string; color: string;
  status: "PUBLISHED" | "UNPUBLISHED";
  term: string | null;
  _count: { enrollments: number };
}

interface Group {
  id: string; name: string;
  courseId?: string;
  groupSetId?: string | null;
  courseName?: string;
  term?: string | null;
  course?: { name: string; term?: string | null };
}

const FONT = "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif";

// ── AllCoursesFullScreen ───────────────────────────────────────────────────────
export function AllCoursesFullScreen({
  onNewCourse,
  onNavigate,
}: {
  onNewCourse?: () => void;
  onNavigate?: (url: string) => void;
}) {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups,  setGroups]  = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition]   = useTransition();

  useEffect(() => {
    fetch("/api/admin/courses")
      .then(r => r.json())
      .then(d => startTransition(() => { setCourses(d.courses ?? []); setLoading(false); }))
      .catch(() => startTransition(() => setLoading(false)));
    fetch("/api/groups")
      .then(r => r.json())
      .then(d => startTransition(() => setGroups(d.groups ?? [])))
      .catch(() => {});
  }, []);

  const handleGroupClick = (g: Group) => {
    if (!g.courseId) return;
    const url = g.groupSetId
      ? `/admin/courses/${g.courseId}/people?tab=groups&groupSet=${g.groupSetId}`
      : `/admin/courses/${g.courseId}/people?tab=groups`;
    if (onNavigate) onNavigate(url); else router.push(url);
  };

  const handleCourseClick = (courseId: string) => {
    const url = `/admin/courses/${courseId}/home`;
    if (onNavigate) onNavigate(url); else router.push(url);
  };

  return (
    <div
      className="flex flex-col h-full bg-white overflow-y-auto"
      style={{ fontFamily: FONT }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 sm:px-8 pt-5 sm:pt-6 pb-4">
        <h1 className="text-lg sm:text-2xl font-black text-gray-900">All Offices</h1>
        {onNewCourse && (
          <button
            onClick={onNewCourse}
            className="bg-[#7b1113] hover:bg-[#5a0d0f] text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors"
          >
            + Office
          </button>
        )}
      </div>

      <div className="flex-1 px-5 sm:px-8 pb-12">
        {loading ? (
          <p className="text-gray-400 text-sm mt-16 text-center">Loading...</p>
        ) : (
          <>
            {/* Courses — table on desktop, cards on mobile */}
            <div className="hidden sm:block mb-12">
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e8d5d5" }}>
                    {[["Office Name", ""], ["Code", "120px"], ["Term", "140px"], ["Published", "100px"]].map(([label, w]) => (
                      <th
                        key={label}
                        style={{
                          textAlign: "left", padding: "8px 0",
                          fontSize: 11, fontWeight: 700, color: "#7b1113",
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
                  {courses.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ color: "#9ca3af", fontSize: 13, padding: "48px 0", textAlign: "center" }}>
                        No offices yet.
                      </td>
                    </tr>
                  ) : courses.map((c, i) => (
                    <tr
                      key={c.id}
                      onClick={() => handleCourseClick(c.id)}
                      style={{ background: i % 2 === 0 ? "#fff" : "#fdf8f8", cursor: "pointer", borderBottom: "1px solid #f3f4f6" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#fdf8f8")}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fdf8f8")}
                    >
                      <td style={{ padding: "10px 16px 10px 0", fontSize: 13 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 9, height: 9, borderRadius: 2, background: c.color, flexShrink: 0, display: "inline-block" }} />
                          <span style={{ color: c.color, fontWeight: 600 }}>{c.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 16px 10px 0", fontSize: 12, color: "#6b7280", fontFamily: "monospace" }}>{c.code}</td>
                      <td style={{ padding: "10px 16px 10px 0", fontSize: 12, color: "#9ca3af" }}>{c.term ?? "—"}</td>
                      <td style={{ padding: "10px 0", fontSize: 12 }}>
                        {c.status === "PUBLISHED"
                          ? <span style={{ color: "#15803d", fontWeight: 600 }}>Yes</span>
                          : <span style={{ color: "#c2410c", fontWeight: 600 }}>No</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile course cards */}
            <div className="sm:hidden space-y-2.5 mb-8">
              <p className="text-[10px] font-black text-[#7b1113] uppercase tracking-widest mb-3">Offices</p>
              {courses.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">No offices yet.</p>
              ) : courses.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleCourseClick(c.id)}
                  className="w-full text-left bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 hover:bg-[#fdf8f8] transition-colors"
                  style={{ borderLeftWidth: 3, borderLeftColor: c.color }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: c.color }}>{c.name}</p>
                    <p className="text-[11px] text-gray-400 font-mono">{c.code}</p>
                    {c.term && <p className="text-[10px] text-gray-400 mt-0.5">{c.term}</p>}
                  </div>
                  <div className="flex items-center shrink-0">
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                  </div>
                </button>
              ))}
            </div>

            {/* Groups section */}
            <h2 className="text-sm sm:text-base font-black text-gray-900 mb-3 sm:mb-4">My Groups</h2>

            {/* Groups — table on desktop */}
            <div className="hidden sm:block">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e8d5d5" }}>
                    {["Group", "Course", "Term"].map(label => (
                      <th key={label} style={{
                        textAlign: "left", padding: "8px 0",
                        fontSize: 11, fontWeight: 700, color: "#7b1113",
                        textTransform: "uppercase", letterSpacing: "0.08em",
                        width: "33%",
                      }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.length === 0 ? (
                    <tr><td colSpan={3} style={{ fontSize: 13, color: "#9ca3af", padding: "16px 0" }}>No groups yet.</td></tr>
                  ) : groups.map((g, i) => (
                    <tr
                      key={g.id}
                      onClick={() => handleGroupClick(g)}
                      style={{
                        background: i % 2 === 0 ? "#fff" : "#fdf8f8",
                        cursor: g.courseId ? "pointer" : "default",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                      onMouseEnter={e => { if (g.courseId) e.currentTarget.style.background = "#fdf8f8"; }}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fdf8f8")}
                    >
                      <td style={{ padding: "10px 16px 10px 0", fontSize: 13, color: "#7b1113", fontWeight: 600 }}>{g.name}</td>
                      <td style={{ padding: "10px 16px 10px 0", fontSize: 13, color: "#4b5563" }}>{g.courseName ?? g.course?.name ?? "—"}</td>
                      <td style={{ padding: "10px 0", fontSize: 12, color: "#9ca3af" }}>{g.term ?? g.course?.term ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Groups — cards on mobile */}
            <div className="sm:hidden space-y-2">
              {groups.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No groups yet.</p>
              ) : groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => handleGroupClick(g)}
                  disabled={!g.courseId}
                  className="w-full text-left bg-white border border-gray-100 rounded-xl p-3.5 flex items-center gap-3 hover:bg-[#fdf8f8] transition-colors disabled:opacity-60 disabled:cursor-default"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#fdf8f8] flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5 text-[#7b1113]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#7b1113] truncate">{g.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {g.courseName ?? g.course?.name ?? "—"}
                      {(g.term ?? g.course?.term) && (
                        <span className="text-gray-400"> · {g.term ?? g.course?.term}</span>
                      )}
                    </p>
                  </div>
                  {g.courseId && <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Course item inside panel ────────────────────────────────────────────────────
function CourseItem({ c, onClick }: { c: Course; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        display: "block", width: "100%", textAlign: "left",
        background: hovered ? "#fdf8f8" : "none",
        border: "none",
        borderBottom: "1px solid #f3f4f6",
        cursor: "pointer",
        padding: "7px 4px",
        borderRadius: 4,
        fontFamily: FONT,
        transition: "background 0.1s",
      }}
    >
      <p style={{ fontSize: 13, color: c.color, fontWeight: 600, margin: 0, lineHeight: 1.35 }}>
        {c.name}
      </p>
      <p style={{ fontSize: 11, color: "#9ca3af", margin: "1px 0 0", fontWeight: 500 }}>
        {c.code}
      </p>
    </button>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────────
export default function AdminCoursesPanel({ onNewCourse }: { onNewCourse: () => void }) {
  const { isOpen, isActive, view, setView, close, closePanel } = useAdminCourses();
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [, startTransition]   = useTransition();

  // Detect mobile (< 640px) to adjust panel positioning
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    startTransition(() => setLoading(true));
    fetch("/api/admin/courses")
      .then(r => r.json())
      .then(d => startTransition(() => { setCourses(d.courses ?? []); setLoading(false); }))
      .catch(() => startTransition(() => setLoading(false)));
  }, [isActive]);

  if (!isActive) return null;

  const isFullScreen    = view === "allCourses";
  const handleXClose    = () => { if (isFullScreen) closePanel(); else close(); };
  const goFullScreen    = () => { setView("allCourses"); closePanel(); };
  const handleNewCourse = () => { onNewCourse(); };
  const handleNavigate  = (url: string) => { close(); router.push(url); };

  const published   = courses.filter(c => c.status === "PUBLISHED");
  const unpublished = courses.filter(c => c.status === "UNPUBLISHED");

  // On mobile: panel appears as full-width bottom sheet; sidebar icon is 0px wide so left=0
  // On desktop: left = 64px (sidebar width)
  const panelLeft   = isMobile ? 0 : 64;
  const panelWidth  = isMobile ? "100%" : 288;

  return (
    <>
      {/* Fullscreen overlay */}
      {isFullScreen && (
        <div
          className="fixed bg-white z-100"
          style={{
            inset: 0,
            left: isMobile ? 0 : 64,
          }}
        >
        
          <AllCoursesFullScreen onNewCourse={handleNewCourse} onNavigate={handleNavigate} />
        </div>
      )}

      {/* Side panel / bottom drawer */}
      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          {isMobile && (
            <div
              className="fixed inset-0 bg-black/20 z-109"
              onClick={handleXClose}
            />
          )}

          <div
            style={{
              position: "fixed",
              // Mobile: full-width drawer sliding up from bottom
              // Desktop: left side panel
              ...(isMobile
                ? {
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "75vh",
                    borderRadius: "16px 16px 0 0",
                    borderTop: "1px solid #e8d5d5",
                    borderRight: "none",
                  }
                : {
                    top: 0,
                    left: panelLeft,
                    height: "100%",
                    width: panelWidth,
                    borderRight: "1px solid #e8d5d5",
                  }
              ),
              background: "#fff",
              boxShadow: isMobile
                ? "0 -4px 20px rgba(123,17,19,0.08)"
                : "2px 0 10px rgba(123,17,19,0.06)",
              zIndex: isFullScreen ? 120 : 110,
              display: "flex",
              flexDirection: "column",
              fontFamily: FONT,
            }}
          >
            {/* Mobile drag handle */}
            {isMobile && (
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>
            )}

            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: isMobile ? "10px 16px 10px" : "14px 16px 12px",
                borderBottom: "1px solid #f0e4e4",
                flexShrink: 0,
              }}
            >
              <h1 style={{ fontSize: 15, fontWeight: 800, color: "#111827", margin: 0 }}>Offices</h1>
              <button
                onClick={handleXClose}
                style={{
                  width: 26, height: 26,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1px solid #e5e7eb", borderRadius: 6,
                  background: "none", cursor: "pointer", color: "#9ca3af",
                  transition: "all 0.12s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#7b1113"; e.currentTarget.style.color = "#7b1113"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#9ca3af"; }}
              >
                <X size={12} />
              </button>
            </div>

            {/* All Offices link */}
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #f0e4e4", flexShrink: 0 }}>
              <button
                onClick={goFullScreen}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  fontSize: 13, fontWeight: 700, color: "#7b1113", fontFamily: FONT,
                }}
                onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
              >
                All Offices
              </button>
            </div>

            <div style={{ height: 1, background: "#e8d5d5", margin: "0 16px", flexShrink: 0 }} />

            {/* Course list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
              {loading ? (
                <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading...</p>
              ) : courses.length === 0 ? (
                <p style={{ fontSize: 13, color: "#9ca3af" }}>No offices yet.</p>
              ) : (
                <>
                  {published.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{
                        fontSize: 10, fontWeight: 800, color: "#111827",
                        textTransform: "uppercase", letterSpacing: "0.07em",
                        margin: "0 0 6px",
                      }}>
                        Published Offices
                      </p>
                      {published.map(c => (
                        <CourseItem
                          key={c.id} c={c}
                          onClick={() => { close(); router.push(`/admin/courses/${c.id}/home`); }}
                        />
                      ))}
                    </div>
                  )}

                  {unpublished.length > 0 && (
                    <div>
                      <p style={{
                        fontSize: 10, fontWeight: 800, color: "#9ca3af",
                        textTransform: "uppercase", letterSpacing: "0.07em",
                        margin: "0 0 6px",
                      }}>
                        Unpublished Offices
                      </p>
                      {unpublished.map(c => (
                        <CourseItem
                          key={c.id} c={c}
                          onClick={() => { close(); router.push(`/admin/courses/${c.id}/home`); }}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {!loading && courses.length > 0 && (
                <p style={{
                  fontSize: 11, color: "#9ca3af", lineHeight: 1.6,
                  marginTop: 20, paddingTop: 12,
                  borderTop: "1px solid #f3f4f6",
                }}>
                  Welcome to your offices! To customize the list of offices, click on the{" "}
                  <button
                    onClick={goFullScreen}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "#7b1113", fontSize: 11, fontWeight: 700,
                      padding: 0, fontFamily: FONT,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
                  >
                    &ldquo;All Offices&rdquo;
                  </button>
                  {" "}link and star the courses to display.
                </p>
              )}
            </div>

            {/* Mobile new-course shortcut */}
            {isMobile && (
              <div className="px-4 py-3 border-t border-gray-100 shrink-0">
                <button
                  onClick={handleNewCourse}
                  className="w-full h-9 bg-[#7b1113] hover:bg-[#5a0d0f] text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  New Office
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}