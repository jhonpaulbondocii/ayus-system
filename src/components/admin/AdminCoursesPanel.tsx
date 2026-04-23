"use client";

import { useState, createContext, useContext, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

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
  courseName?: string;        // flat field from API
  term?: string | null;       // flat field from API
  course?: { name: string; term?: string | null }; // kept for backwards compat
}

// ── Shared ─────────────────────────────────────────────────────────────────────
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff", fontFamily: FONT, overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px 16px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>All Courses</h1>
        {onNewCourse && (
          <button onClick={onNewCourse}
            style={{ background: "#7b1113", color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}
            onMouseEnter={e => (e.currentTarget.style.background = "#5a0d0f")}
            onMouseLeave={e => (e.currentTarget.style.background = "#7b1113")}>
            + Course
          </button>
        )}
      </div>

      <div style={{ flex: 1, padding: "0 32px 48px" }}>
        {loading ? (
          <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 60, textAlign: "center" }}>Loading...</p>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 48 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e8d5d5" }}>
                  {[["Course Name", ""], ["Code", "120px"], ["Term", "120px"], ["Published", "100px"]].map(([label, w]) => (
                    <th key={label} style={{
                      textAlign: "left", padding: "8px 0",
                      fontSize: 11, fontWeight: 700, color: "#7b1113",
                      textTransform: "uppercase", letterSpacing: "0.08em",
                      width: w || undefined,
                    }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courses.length === 0 ? (
                  <tr><td colSpan={4} style={{ color: "#9ca3af", fontSize: 13, padding: "48px 0", textAlign: "center" }}>No courses yet.</td></tr>
                ) : courses.map((c, i) => (
                  <tr key={c.id} onClick={() => handleCourseClick(c.id)}
                    style={{ background: i % 2 === 0 ? "#fff" : "#fdf8f8", cursor: "pointer", borderBottom: "1px solid #f3f4f6" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#fdf8f8")}
                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fdf8f8")}>
                    <td style={{ padding: "10px 16px 10px 0", fontSize: 13 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 2, background: c.color, flexShrink: 0, display: "inline-block" }} />
                        {/* designated course color preserved */}
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

            <h2 style={{ fontSize: 15, fontWeight: 800, color: "#111827", marginBottom: 12 }}>My Groups</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e8d5d5" }}>
                  {["Group", "Course", "Term"].map(label => (
                    <th key={label} style={{ textAlign: "left", padding: "8px 0", fontSize: 11, fontWeight: 700, color: "#7b1113", textTransform: "uppercase", letterSpacing: "0.08em", width: "33%" }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.length === 0 ? (
                  <tr><td colSpan={3} style={{ fontSize: 13, color: "#9ca3af", padding: "16px 0" }}>No groups yet.</td></tr>
                ) : groups.map((g, i) => (
                  <tr key={g.id} onClick={() => handleGroupClick(g)}
                    style={{ background: i % 2 === 0 ? "#fff" : "#fdf8f8", cursor: g.courseId ? "pointer" : "default", borderBottom: "1px solid #f3f4f6" }}
                    onMouseEnter={e => { if (g.courseId) e.currentTarget.style.background = "#fdf8f8"; }}
                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fdf8f8")}>
                    <td style={{ padding: "10px 16px 10px 0", fontSize: 13, color: "#7b1113", fontWeight: 600 }}>{g.name}</td>
                    <td style={{ padding: "10px 16px 10px 0", fontSize: 13, color: "#4b5563" }}>{g.courseName ?? g.course?.name ?? "—"}</td>
                    <td style={{ padding: "10px 0", fontSize: 12, color: "#9ca3af" }}>{g.term ?? g.course?.term ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      {/* course name: keep its designated color */}
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

  return (
    <>
      {/* Fullscreen overlay */}
      {isFullScreen && (
        <div className="fixed inset-0 left-16 bg-white z-[100]">
          <AllCoursesFullScreen onNewCourse={handleNewCourse} onNavigate={handleNavigate} />
        </div>
      )}

      {/* Side panel */}
      {isOpen && (
        <div style={{
          position: "fixed", top: 0, left: 64, height: "100%", width: 288,
          background: "#fff",
          borderRight: "1px solid #e8d5d5",
          boxShadow: "2px 0 10px rgba(123,17,19,0.06)",
          zIndex: isFullScreen ? 120 : 110,
          display: "flex", flexDirection: "column",
          fontFamily: FONT,
        }}>

          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px 12px",
            borderBottom: "1px solid #f0e4e4",
            flexShrink: 0,
          }}>
            <h1 style={{ fontSize: 15, fontWeight: 800, color: "#111827", margin: 0 }}>
              Courses
            </h1>
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

          {/* All Courses link */}
          <div style={{ padding: "10px 16px 10px", borderBottom: "1px solid #f0e4e4", flexShrink: 0 }}>
            <button
              onClick={goFullScreen}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: 0,
                fontSize: 13, fontWeight: 700, color: "#7b1113", fontFamily: FONT,
              }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
            >
              All Courses
            </button>
          </div>

          {/* Divider (matches screenshot) */}
          <div style={{ height: 1, background: "#e8d5d5", margin: "0 16px", flexShrink: 0 }} />

          {/* Course list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
            {loading ? (
              <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading...</p>
            ) : courses.length === 0 ? (
              <p style={{ fontSize: 13, color: "#9ca3af" }}>No courses yet.</p>
            ) : (
              <>
                {published.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{
                      fontSize: 10, fontWeight: 800, color: "#111827",
                      textTransform: "uppercase", letterSpacing: "0.07em",
                      margin: "0 0 6px",
                    }}>
                      Published Courses
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
                      Unpublished Courses
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

            {/* Footer hint */}
            {!loading && courses.length > 0 && (
              <p style={{
                fontSize: 11, color: "#9ca3af", lineHeight: 1.6,
                marginTop: 20, paddingTop: 12,
                borderTop: "1px solid #f3f4f6",
              }}>
                Welcome to your courses! To customize the list of courses, click on the{" "}
                <button
                  onClick={goFullScreen}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#7b1113", fontSize: 11, fontWeight: 700, padding: 0, fontFamily: FONT }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
                >
                  &ldquo;All Courses&rdquo;
                </button>
                {" "}link and star the courses to display.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}