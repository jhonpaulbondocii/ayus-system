"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const MAROON = "#7b1113";
const FONT = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

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
}

export default function CourseHomePage({ courseId, courseName: initialCourseName }: Props) {
  const router = useRouter();
  const [published, setPublished] = useState(false);
  const [courseName, setCourseName] = useState(initialCourseName);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [stats, setStats] = useState<Stats>({ people: 0, announcements: 0, assignments: 0 });

  useEffect(() => {
    if (!courseId) return;

    fetch(`/api/admin/courses/${courseId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.course) {
          setPublished(d.course.status === "PUBLISHED");
          if (d.course.name) setCourseName(d.course.name);
        }
      })
      .catch(() => {});

    fetch(`/api/admin/courses/${courseId}/activity`)
      .then((r) => r.json())
      .then((d) => {
        setActivity(d.activity ?? []);
        setStats(d.stats ?? { people: 0, announcements: 0, assignments: 0 });
      })
      .catch(() => {
        setActivity([
          { id: "1", type: "submission",  text: 'submitted "Case Study 1"', user: "Juan Dela Cruz", time: "2 hours ago" },
          { id: "2", type: "announcement",text: 'New announcement: "Welcome to the course!"', time: "5 hours ago" },
          { id: "3", type: "enrollment",  text: "joined the course as Student", user: "Maria Santos", time: "1 day ago" },
        ]);
      })
      .finally(() => setLoadingActivity(false));
  }, [courseId]);

  const handlePublishToggle = async () => {
    const next = !published;
    setPublished(next);
    try {
      await fetch(`/api/admin/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next ? "PUBLISHED" : "UNPUBLISHED" }),
      });
    } catch {
      setPublished(!next);
    }
  };

  const quickActions = [
    {
      label: "New Announcement",
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      onClick: () => router.push(`/admin/courses/${courseId}/announcements`),
    },
    {
      label: "New Assignment",
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="9" x2="15" y2="9" strokeLinecap="round" />
          <line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round" />
          <line x1="9" y1="17" x2="13" y2="17" strokeLinecap="round" />
        </svg>
      ),
      onClick: () => router.push(`/admin/courses/${courseId}/assignments/new`),
    },
    {
      label: "View People",
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
        </svg>
      ),
      onClick: () => router.push(`/admin/courses/${courseId}/people`),
    },
    {
      label: "New Quiz",
      icon: (
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="12" cy="10" r="2.5" strokeLinecap="round" />
          <path d="M12 13v1.5" strokeLinecap="round" />
          <line x1="8" y1="17" x2="16" y2="17" strokeLinecap="round" />
        </svg>
      ),
      onClick: () => router.push(`/admin/courses/${courseId}/quizzes`),
    },
  ];

  const activityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "submission":
        return (
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" fill="none" stroke="#3b82f6" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" />
              <polyline points="17 8 12 3 7 8" strokeLinecap="round" />
              <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
            </svg>
          </div>
        );
      case "announcement":
        return (
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#fdf2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" fill="none" stroke={MAROON} strokeWidth={2} viewBox="0 0 24 24">
              <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round" />
            </svg>
          </div>
        );
      case "enrollment":
        return (
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" fill="none" stroke="#16a34a" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" strokeLinecap="round" />
              <line x1="23" y1="11" x2="17" y2="11" strokeLinecap="round" />
            </svg>
          </div>
        );
      default:
        return (
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" fill="none" stroke="#9ca3af" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
              <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", fontFamily: FONT, background: "#f8f8f7" }}>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>

        {/* Welcome Panel */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #f0e4e4", overflow: "hidden", marginBottom: 20 }}>
          <div style={{ background: MAROON, padding: "24px 28px" }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.2em", margin: 0 }}>
              Welcome to
            </p>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: "#fff", margin: "6px 0 0", lineHeight: 1.3 }}>
              {courseName}
            </h1>
          </div>

          <div style={{ padding: "20px 28px" }}>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px", lineHeight: 1.7 }}>
              Manage announcements, assignments, people, and course activity here.
            </p>

            <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
              {[
                { label: "People",        value: stats.people,        color: "#3b82f6", bg: "#eff6ff" },
                { label: "Assignments",   value: stats.assignments,   color: MAROON,    bg: "#fdf2f2" },
                { label: "Announcements", value: stats.announcements, color: "#8b5cf6", bg: "#f5f3ff" },
              ].map((s) => (
                <div key={s.label} style={{ flex: 1, background: s.bg, borderRadius: 10, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</span>
                  <span style={{ fontSize: 11, color: s.color, fontWeight: 600, opacity: 0.7 }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "20px 24px", marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: "#374151", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 14px" }}>
            Quick Actions
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px", borderRadius: 10,
                  border: "1px solid #e5e7eb", background: "#fafafa",
                  cursor: "pointer", fontFamily: FONT, textAlign: "left",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = MAROON;
                  (e.currentTarget as HTMLButtonElement).style.background = "#fdf2f2";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb";
                  (e.currentTarget as HTMLButtonElement).style.background = "#fafafa";
                }}
              >
                <span style={{ color: MAROON, display: "flex", flexShrink: 0 }}>{action.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "20px 24px" }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: "#374151", textTransform: "uppercase", letterSpacing: "0.12em", margin: "0 0 14px" }}>
            Recent Activity
          </p>

          {loadingActivity ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 0" }}>
              <div style={{ width: 16, height: 16, border: `2px solid #f0e4e4`, borderTop: `2px solid ${MAROON}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <span style={{ fontSize: 12, color: "#9ca3af" }}>Loading activity...</span>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : activity.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>No recent activity</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {activity.map((item, idx) => (
                <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: idx < activity.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                  {activityIcon(item.type)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: "#374151", margin: 0, lineHeight: 1.5 }}>
                      {item.user && <span style={{ fontWeight: 700, color: "#111827" }}>{item.user} </span>}
                      {item.text}
                    </p>
                    <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0", fontWeight: 500 }}>{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right Sidebar ── */}
      <div style={{ width: 220, borderLeft: "1px solid #e5e7eb", flexShrink: 0, overflowY: "auto", padding: "20px 16px", background: "#fff" }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: "#374151", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>
          Course Status
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: published ? "#16a34a" : "#9ca3af", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", flex: 1 }}>
            {published ? "Published" : "Unpublished"}
          </span>
          <button
            type="button"
            onClick={handlePublishToggle}
            style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: `1px solid ${MAROON}`, color: MAROON, background: "#fff", cursor: "pointer", fontWeight: 600, fontFamily: FONT }}
          >
            {published ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}