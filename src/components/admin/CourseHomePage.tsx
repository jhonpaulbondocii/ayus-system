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
  quizzes: number;
}

interface Deadline {
  id: string;
  title: string;
  type: "assignment" | "quiz";
  dueDate: string;
  submissions: number;
  total: number;
}

interface RecentEnrollment {
  id: string;
  name: string;
  image: string | null;
  role: string;
  joinedAt: string;
}

interface CourseInfo {
  code: string;
  section: string;
  schedule: string;
  room: string;
}

interface AnnouncementPreview {
  id: string;
  title: string;
  postedAt: string;
  author: string;
}

export default function CourseHomePage({ courseId, courseName: initialCourseName }: Props) {
  const router = useRouter();
  const [courseName, setCourseName] = useState(initialCourseName);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [stats, setStats] = useState<Stats>({ people: 0, announcements: 0, assignments: 0, quizzes: 0 });
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [enrollments, setEnrollments] = useState<RecentEnrollment[]>([]);
  const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementPreview[]>([]);

  useEffect(() => {
    if (!courseId) return;

    fetch(`/api/admin/courses/${courseId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.course?.name) setCourseName(d.course.name);
        if (d.course?.info) setCourseInfo(d.course.info);
      })
      .catch(() => {});

    fetch(`/api/admin/courses/${courseId}/activity`)
      .then((r) => r.json())
      .then((d) => {
        setActivity(d.activity ?? []);
        setStats(d.stats ?? { people: 0, announcements: 0, assignments: 0, quizzes: 0 });
      })
      .catch(() => {
        setActivity([
          { id: "1", type: "submission",   text: 'submitted "Case Study 1"', user: "Juan Dela Cruz", time: "2 hours ago" },
          { id: "2", type: "announcement", text: 'New announcement: "Welcome to the course!"', time: "5 hours ago" },
          { id: "3", type: "enrollment",   text: "joined the course as Staff", user: "Maria Santos", time: "1 day ago" },
        ]);
      })
      .finally(() => setLoadingActivity(false));

    fetch(`/api/admin/courses/${courseId}/deadlines`)
      .then((r) => r.json())
      .then((d) => setDeadlines(d.deadlines ?? []))
      .catch(() => setDeadlines([]));

    fetch(`/api/admin/courses/${courseId}/enrollments/recent`)
      .then((r) => r.json())
      .then((d) => setEnrollments(d.enrollments ?? []))
      .catch(() => setEnrollments([]));

    fetch(`/api/admin/courses/${courseId}/announcements?limit=3`)
      .then((r) => r.json())
      .then((d) => setAnnouncements(d.announcements ?? []))
      .catch(() => setAnnouncements([]));
  }, [courseId]);

  const quickActions = [
    {
      label: "New Announcement",
      icon: (
        <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      onClick: () => router.push(`/admin/courses/${courseId}/announcements`),
    },
    {
      label: "New Assignment",
      icon: (
        <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
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
        <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
        </svg>
      ),
      onClick: () => router.push(`/admin/courses/${courseId}/people`),
    },
    {
      label: "View Grades",
      icon: (
        <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      onClick: () => router.push(`/admin/courses/${courseId}/grades`),
    },
  ];

  const activityIcon = (type: ActivityItem["type"]) => {
    const cfg: Record<ActivityItem["type"], { bg: string; stroke: string; d: React.ReactNode }> = {
      submission: {
        bg: "#eff6ff", stroke: "#3b82f6",
        d: (<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" /><polyline points="17 8 12 3 7 8" strokeLinecap="round" /><line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" /></>),
      },
      announcement: {
        bg: "#fdf2f2", stroke: MAROON,
        d: (<path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round" />),
      },
      enrollment: {
        bg: "#f0fdf4", stroke: "#16a34a",
        d: (<><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" strokeLinecap="round" /><line x1="23" y1="11" x2="17" y2="11" strokeLinecap="round" /></>),
      },
      grade: {
        bg: "#fefce8", stroke: "#ca8a04",
        d: (<><path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" /></>),
      },
      general: {
        bg: "#f9fafb", stroke: "#9ca3af",
        d: (<><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" /><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" /></>),
      },
    };
    const c = cfg[type];
    return (
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="13" height="13" fill="none" stroke={c.stroke} strokeWidth={2} viewBox="0 0 24 24">{c.d}</svg>
      </div>
    );
  };

  const Avatar = ({ name, image, size = 30 }: { name: string; image: string | null; size?: number }) => {
    if (image) return <img src={image} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", background: "#f0e4e4", color: MAROON, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 800, flexShrink: 0 }}>
        {name?.[0]?.toUpperCase()}
      </div>
    );
  };

  const pct = (s: number, t: number) => (t > 0 ? Math.round((s / t) * 100) : 0);

  const css = `
    * { box-sizing: border-box; }
    .chp-root {
      font-family: ${FONT};
      background: #f4f4f3;
      min-height: 100%;
      overflow-y: auto;
    }
    .chp-wrap {
      padding: 16px;
      width: 100%;
    }

    /* Banner */
    .chp-banner {
      background: ${MAROON};
      border-radius: 14px 14px 0 0;
      padding: 20px 24px 18px;
    }
    .chp-banner-label {
      font-size: 10px;
      font-weight: 800;
      color: rgba(255,255,255,.5);
      text-transform: uppercase;
      letter-spacing: .2em;
      margin: 0;
    }
    .chp-banner-title {
      font-size: 19px;
      font-weight: 900;
      color: #fff;
      margin: 5px 0 0;
      line-height: 1.3;
    }

    /* Stat strip */
    .chp-stat-strip {
      background: #fff;
      border-radius: 0 0 14px 14px;
      border: 1px solid #e5e7eb;
      border-top: none;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      margin-bottom: 14px;
    }
    .chp-stat-item {
      padding: 14px 16px;
      border-right: 1px solid #f3f4f6;
    }
    .chp-stat-item:last-child { border-right: none; }

    /* Main grid */
    .chp-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 280px;
      gap: 14px;
      align-items: start;
    }
    .chp-col { display: flex; flex-direction: column; gap: 14px; }

    /* Cards */
    .chp-card {
      background: #fff;
      border-radius: 14px;
      border: 1px solid #e5e7eb;
      overflow: hidden;
    }
    .chp-pad { padding: 16px 18px; }
    .chp-label {
      font-size: 10.5px;
      font-weight: 800;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: .12em;
      margin: 0 0 12px;
    }

    /* Quick actions */
    .chp-action-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .chp-action-btn {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 10px 12px;
      border-radius: 9px;
      border: 1px solid #e5e7eb;
      background: #fafafa;
      cursor: pointer;
      font-family: ${FONT};
      text-align: left;
      transition: all .15s;
      width: 100%;
    }
    .chp-action-btn:hover { border-color: ${MAROON}; background: #fdf2f2; }

    /* View all */
    .chp-view-all {
      display: block;
      width: 100%;
      text-align: center;
      font-size: 11.5px;
      font-weight: 700;
      color: ${MAROON};
      padding: 9px;
      border-top: 1px solid #f0e4e4;
      cursor: pointer;
      background: none;
      border-left: none;
      border-right: none;
      border-bottom: none;
      font-family: ${FONT};
      transition: background .1s;
    }
    .chp-view-all:hover { background: #fdf8f8; }

    /* Spinner */
    .chp-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid #f0e4e4;
      border-top: 2px solid ${MAROON};
      border-radius: 50%;
      animation: chp-spin .8s linear infinite;
    }
    @keyframes chp-spin { to { transform: rotate(360deg); } }

    /* ── Responsive ── */

    /* Tablet: 2-col left, sidebar right */
    @media (max-width: 1024px) {
      .chp-grid {
        grid-template-columns: 1fr 260px;
      }
      .chp-col-mid { display: none; } /* merge mid into left on tablet */
    }

    /* Phablet: stack everything */
    @media (max-width: 768px) {
      .chp-wrap { padding: 10px; }
      .chp-grid {
        grid-template-columns: 1fr;
        gap: 10px;
      }
      .chp-col-mid { display: flex; }
      .chp-stat-strip {
        grid-template-columns: repeat(2, 1fr);
      }
      .chp-stat-item:nth-child(2) { border-right: none; }
      .chp-stat-item:nth-child(1),
      .chp-stat-item:nth-child(2) { border-bottom: 1px solid #f3f4f6; }
      .chp-banner { padding: 16px 18px 14px; }
      .chp-banner-title { font-size: 16px; }
      .chp-action-grid { grid-template-columns: 1fr 1fr; }
    }

    @media (max-width: 420px) {
      .chp-pad { padding: 12px 14px; }
      .chp-action-grid { grid-template-columns: 1fr 1fr; gap: 6px; }
    }
  `;

  const statItems = [
    {
      label: "People", value: stats.people, color: "#3b82f6", bg: "#eff6ff",
      icon: <svg width="14" height="14" fill="none" stroke="#3b82f6" strokeWidth={2} viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round"/></svg>,
    },
    {
      label: "Assignments", value: stats.assignments, color: MAROON, bg: "#fdf2f2",
      icon: <svg width="14" height="14" fill="none" stroke={MAROON} strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9" strokeLinecap="round"/><line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round"/></svg>,
    },
    {
      label: "Quizzes", value: stats.quizzes, color: "#0891b2", bg: "#ecfeff",
      icon: <svg width="14" height="14" fill="none" stroke="#0891b2" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="10" r="2.5"/><path d="M12 13v1.5" strokeLinecap="round"/><line x1="8" y1="17" x2="16" y2="17" strokeLinecap="round"/></svg>,
    },
    {
      label: "Announcements", value: stats.announcements, color: "#8b5cf6", bg: "#f5f3ff",
      icon: <svg width="14" height="14" fill="none" stroke="#8b5cf6" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round"/></svg>,
    },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="chp-root">
        <div className="chp-wrap">

          {/* Banner */}
          <div className="chp-banner">
            <p className="chp-banner-label">Welcome to</p>
            <h1 className="chp-banner-title">{courseName}</h1>
          </div>

          {/* Stat strip */}
          <div className="chp-stat-strip">
            {statItems.map((s) => (
              <div key={s.label} className="chp-stat-item">
                <div style={{ marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 10.5, color: s.color, fontWeight: 600, opacity: 0.75, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* 3-col grid */}
          <div className="chp-grid">

            {/* ── COL 1: Quick Actions + Activity ── */}
            <div className="chp-col">

              {/* Quick Actions */}
              <div className="chp-card chp-pad">
                <p className="chp-label">Quick Actions</p>
                <div className="chp-action-grid">
                  {quickActions.map((a) => (
                    <button key={a.label} type="button" className="chp-action-btn" onClick={a.onClick}>
                      <span style={{ color: MAROON, display: "flex", flexShrink: 0 }}>{a.icon}</span>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: "#374151" }}>{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="chp-card chp-pad" style={{ flex: 1 }}>
                <p className="chp-label">Recent Activity</p>
                {loadingActivity ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0" }}>
                    <div className="chp-spinner" />
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>Loading...</span>
                  </div>
                ) : activity.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "12px 0", margin: 0 }}>No recent activity</p>
                ) : activity.map((item, idx) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderBottom: idx < activity.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                    {activityIcon(item.type)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11.5, color: "#374151", margin: 0, lineHeight: 1.5 }}>
                        {item.user && <span style={{ fontWeight: 700, color: "#111827" }}>{item.user} </span>}
                        {item.text}
                      </p>
                      <p style={{ fontSize: 10.5, color: "#9ca3af", margin: "2px 0 0" }}>{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── COL 2: Deadlines + Course Info (hidden on tablet, shown on desktop & mobile) ── */}
            <div className="chp-col chp-col-mid">

              {/* Upcoming Deadlines */}
              <div className="chp-card">
                <div className="chp-pad">
                  <p className="chp-label">Upcoming Deadlines</p>
                  {deadlines.length === 0 ? (
                    <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "12px 0", margin: 0 }}>No upcoming deadlines</p>
                  ) : deadlines.map((d, idx) => (
                    <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: idx < deadlines.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: d.type === "quiz" ? "#ecfeff" : "#fdf2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {d.type === "quiz" ? (
                          <svg width="14" height="14" fill="none" stroke="#0891b2" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="10" r="2.5"/><path d="M12 13v1.5" strokeLinecap="round"/><line x1="8" y1="17" x2="16" y2="17" strokeLinecap="round"/></svg>
                        ) : (
                          <svg width="14" height="14" fill="none" stroke={MAROON} strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9" strokeLinecap="round"/><line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round"/></svg>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</p>
                        <p style={{ fontSize: 10.5, color: "#9ca3af", margin: "2px 0 4px" }}>{d.dueDate}</p>
                        <div style={{ height: 3, borderRadius: 2, background: "#f0e4e4", overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 2, background: MAROON, width: `${pct(d.submissions, d.total)}%` }} />
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: MAROON }}>{d.submissions}</span>
                        <span style={{ fontSize: 10.5, color: "#9ca3af" }}>/{d.total}</span>
                        <p style={{ fontSize: 10, color: "#9ca3af", margin: "1px 0 0" }}>submitted</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="chp-view-all" onClick={() => router.push(`/admin/courses/${courseId}/assignments`)}>
                  View All Assignments & Quizzes →
                </button>
              </div>

              {/* Course Info */}
              {courseInfo && (
                <div className="chp-card chp-pad">
                  <p className="chp-label">Course Info</p>
                  {[
                    { label: "Course Code", value: courseInfo.code,    icon: "🏷️" },
                    { label: "Section",     value: courseInfo.section,  icon: "📋" },
                    { label: "Schedule",    value: courseInfo.schedule, icon: "🕐" },
                    { label: "Room",        value: courseInfo.room,     icon: "📍" },
                  ].map((row, idx, arr) => (
                    <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 0", borderBottom: idx < arr.length - 1 ? "1px solid #f9fafb" : "none" }}>
                      <span style={{ fontSize: 14 }}>{row.icon}</span>
                      <div>
                        <p style={{ fontSize: 9.5, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", margin: 0 }}>{row.label}</p>
                        <p style={{ fontSize: 12, color: "#111827", fontWeight: 600, margin: "1px 0 0" }}>{row.value || "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── COL 3 (sidebar): Enrollments + Announcements ── */}
            <div className="chp-col">

              {/* Recent Enrollments */}
              <div className="chp-card">
                <div className="chp-pad">
                  <p className="chp-label">Recent Enrollments</p>
                  {enrollments.length === 0 ? (
                    <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "12px 0", margin: 0 }}>No recent enrollments</p>
                  ) : enrollments.map((e, idx) => (
                    <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 0", borderBottom: idx < enrollments.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                      <Avatar name={e.name} image={e.image} size={30} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</p>
                        <p style={{ fontSize: 10.5, color: "#9ca3af", margin: "1px 0 0" }}>{e.role} · {e.joinedAt}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="chp-view-all" onClick={() => router.push(`/admin/courses/${courseId}/people`)}>
                  View All People →
                </button>
              </div>

              {/* Announcements */}
              <div className="chp-card">
                <div className="chp-pad">
                  <p className="chp-label">Recent Announcements</p>
                  {announcements.length === 0 ? (
                    <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "12px 0", margin: 0 }}>No announcements yet</p>
                  ) : announcements.map((a, idx) => (
                    <div
                      key={a.id}
                      onClick={() => router.push(`/admin/courses/${courseId}/announcements/${a.id}`)}
                      style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "9px 8px", borderBottom: idx < announcements.length - 1 ? "1px solid #f3f4f6" : "none", cursor: "pointer", borderRadius: 8, margin: "0 -8px", transition: "background .1s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fdf8f8")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#fdf2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="12" height="12" fill="none" stroke={MAROON} strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</p>
                        <p style={{ fontSize: 10.5, color: "#9ca3af", margin: "2px 0 0" }}>{a.author} · {a.postedAt}</p>
                      </div>
                      <svg width="12" height="12" fill="none" stroke="#9ca3af" strokeWidth={2} viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 2 }}>
                        <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  ))}
                </div>
                <button className="chp-view-all" onClick={() => router.push(`/admin/courses/${courseId}/announcements`)}>
                  View All Announcements →
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}