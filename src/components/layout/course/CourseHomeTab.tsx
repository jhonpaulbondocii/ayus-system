"use client";

// src/components/layout/course/CourseHomeTab.tsx

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  COLORS, MAROON, FONT,
  fmtDate, fmtDue, normalizeAnnouncement,
} from "./helpers";
import type {
  Course, Membership, Group,
  Assignment, Announcement, RawAnnouncement,
} from "./types";

/* ─────────────────────────────────────────────────────────────────────────────
   PROPS
───────────────────────────────────────────────────────────────────────────── */
interface Props {
  course: Course;
  membership: Membership | null;
  groups: Group[];
  courseId: string;
  canManageAnnouncements: boolean;
  canManageAssignments: boolean;
  canManagePeople: boolean;
  canManageCourse: boolean;
  isHead: boolean;
  onTabChange: (tab: string) => void;
}

/* ─────────────────────────────────────────────────────────────────────────────
   CSS
───────────────────────────────────────────────────────────────────────────── */
const CSS = `
.cht-root { font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; }

/* ── stat card ── */
.cht-stat {
  background:#fff;
  border:1px solid #f0e4e4;
  border-radius:14px;
  padding:18px 22px;
  display:flex;
  flex-direction:column;
  gap:4px;
  transition:box-shadow .2s, border-color .2s;
  cursor:default;
}
.cht-stat:hover { box-shadow:0 4px 18px rgba(123,17,19,.09); border-color:#f0c0c0; }
.cht-stat-val  { font-size:28px; font-weight:800; color:#7b1113; line-height:1; }
.cht-stat-lbl  { font-size:11px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:.07em; margin-top:2px; }

/* ── section card ── */
.cht-card {
  background:#fff;
  border:1px solid #f0e4e4;
  border-radius:14px;
  overflow:hidden;
}
.cht-card-header {
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 18px;
  border-bottom:1px solid #f9f0f0;
  background:#fdf8f8;
}
.cht-card-title {
  font-size:12px; font-weight:800; color:#7b1113;
  text-transform:uppercase; letter-spacing:.08em;
}
.cht-card-link {
  font-size:11px; font-weight:700; color:#7b1113;
  background:none; border:none; cursor:pointer; text-decoration:underline; opacity:.7;
}
.cht-card-link:hover { opacity:1; }

/* ── list rows ── */
.cht-row {
  display:flex; align-items:center; gap:12px;
  padding:11px 18px;
  border-bottom:1px solid #fdf0f0;
  transition:background .12s;
}
.cht-row:last-child { border-bottom:none; }
.cht-row:hover { background:#fdf8f8; }
.cht-row-icon {
  width:32px; height:32px; border-radius:8px;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
}
.cht-row-title { font-size:13px; font-weight:600; color:#111827; }
.cht-row-sub   { font-size:11px; color:#9ca3af; margin-top:1px; }
.cht-row-right  { margin-left:auto; text-align:right; flex-shrink:0; }
.cht-row-badge {
  font-size:10px; font-weight:800;
  padding:3px 8px; border-radius:20px;
  display:inline-block;
}

/* ── quick action btn ── */
.cht-qa {
  display:flex; flex-direction:column; align-items:center; gap:8px;
  padding:16px 12px;
  background:#fff; border:1px solid #f0e4e4; border-radius:12px;
  cursor:pointer; transition:all .18s; text-align:center;
  flex:1;
}
.cht-qa:hover { background:#fdf8f8; border-color:#f0c0c0; transform:translateY(-1px); box-shadow:0 4px 14px rgba(123,17,19,.09); }
.cht-qa-icon {
  width:38px; height:38px; border-radius:10px;
  display:flex; align-items:center; justify-content:center;
  background:#fef2f2;
}
.cht-qa-lbl { font-size:11px; font-weight:700; color:#374151; line-height:1.3; }

/* ── activity item ── */
.cht-act {
  display:flex; align-items:flex-start; gap:10px;
  padding:10px 18px; border-bottom:1px solid #fdf0f0;
  transition:background .12s;
}
.cht-act:last-child { border-bottom:none; }
.cht-act:hover { background:#fdf8f8; }
.cht-act-dot {
  width:8px; height:8px; border-radius:50%;
  flex-shrink:0; margin-top:5px;
}

/* ── progress bar ── */
.cht-bar-bg { height:6px; background:#f3f4f6; border-radius:99px; overflow:hidden; }
.cht-bar-fill { height:100%; border-radius:99px; background:linear-gradient(90deg,#7b1113,#b91c1c); transition:width .4s ease; }

/* ── empty state ── */
.cht-empty {
  padding:28px 18px; text-align:center;
  font-size:12px; color:#9ca3af;
  display:flex; flex-direction:column; align-items:center; gap:6px;
}

/* ── staff welcome banner ── */
.cht-welcome {
  border-radius:16px; padding:24px 28px;
  background:linear-gradient(135deg,#7b1113 0%,#b91c1c 60%,#dc2626 100%);
  color:#fff; position:relative; overflow:hidden;
}
.cht-welcome::before {
  content:''; position:absolute; right:-40px; top:-40px;
  width:180px; height:180px; border-radius:50%;
  background:rgba(255,255,255,.06);
}
.cht-welcome::after {
  content:''; position:absolute; right:40px; bottom:-60px;
  width:140px; height:140px; border-radius:50%;
  background:rgba(255,255,255,.04);
}

@keyframes cht-fade-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
.cht-fade { animation:cht-fade-in .35s ease both; }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   SHARED SMALL COMPONENTS
───────────────────────────────────────────────────────────────────────────── */
function MembershipBadge({ role }: { role: "Staff" | "Head" }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center",
        borderRadius: 999, padding: "3px 10px",
        fontSize: 11, fontWeight: 700, border: "1px solid #f0c0c0",
        color: MAROON, background: "#fdf8f8",
      }}
    >
      {role}
    </span>
  );
}

function AssignmentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="3" width="14" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  );
}

function AnnouncementIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 7.535V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7.535" strokeLinecap="round" />
      <path d="M22 7 12 13 2 7" strokeLinecap="round" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
    </svg>
  );
}

function GradeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinecap="round" />
    </svg>
  );
}

function QuizIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" strokeLinecap="round" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   HEAD HOME VIEW
───────────────────────────────────────────────────────────────────────────── */
function HeadHomeView({
  course, courseId, groups,
  canManageAnnouncements, canManageAssignments, canManagePeople,
  onTabChange,
}: {
  course: Course; courseId: string; groups: Group[];
  canManageAnnouncements: boolean; canManageAssignments: boolean; canManagePeople: boolean;
  onTabChange: (tab: string) => void;
}) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [peopleCount, setPeopleCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/courses/${courseId}/assignments`).then((r) => r.json()).catch(() => ({ assignments: [] })),
      fetch(`/api/courses/${courseId}/announcements`).then((r) => r.json()).catch(() => ({ announcements: [] })),
      fetch(`/api/courses/${courseId}/people`).then((r) => r.json()).catch(() => ({ people: [] })),
    ]).then(([aData, anData, pData]) => {
      setAssignments(aData.assignments ?? []);
      const raw = anData.announcements ?? anData.items ?? anData.data ?? [];
      setAnnouncements(raw.map((item: RawAnnouncement, i: number) => normalizeAnnouncement(item, i)));
      setPeopleCount((pData.people ?? []).length);
      setLoading(false);
    });
  }, [courseId]);

  const now = new Date();

  // Stats
  const totalAssignments = assignments.length;
  const publishedAssignments = assignments.filter((a) => a.status === "PUBLISHED").length;
  const ungradedCount = assignments.filter((a) => {
    const subs = a.submissions ?? [];
    return subs.some((s) => s.status === "SUBMITTED" && s.grade == null);
  }).length;
  const upcomingDue = assignments.filter((a) => a.dueDate && new Date(a.dueDate) > now && new Date(a.dueDate) <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)).length;

  // Recent items
  const recentAnnouncements = announcements.slice(0, 4);
  const upcomingAssignments = assignments
    .filter((a) => a.dueDate && new Date(a.dueDate) >= now)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);
  const unpublishedAssignments = assignments.filter((a) => a.status !== "PUBLISHED").slice(0, 4);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "#9ca3af", fontSize: 13, fontFamily: FONT }}>
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="cht-root cht-fade" style={{ padding: "24px 28px", maxWidth: 1100 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>{course.name}</h1>
            <MembershipBadge role="Head" />
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: course.status === "published" ? "#f0fdf4" : "#f9fafb", color: course.status === "published" ? "#15803d" : "#6b7280", border: `1px solid ${course.status === "published" ? "#bbf7d0" : "#e5e7eb"}` }}>
              {course.status === "published" ? "Published" : "Unpublished"}
            </span>
          </div>
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>{course.code}{course.term ? ` · ${course.term}` : ""}</p>
        </div>
        {course.image && (
          <div style={{ width: 80, height: 56, borderRadius: 10, overflow: "hidden", border: "1px solid #f0e4e4", flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={course.image} alt={course.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
      </div>

      {/* ── Stats Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <div className="cht-stat" onClick={() => onTabChange("Assignments")} style={{ cursor: "pointer" }}>
          <div className="cht-stat-val">{totalAssignments}</div>
          <div className="cht-stat-lbl">Total Assignments</div>
        </div>
        <div className="cht-stat" onClick={() => onTabChange("Assignments")} style={{ cursor: "pointer" }}>
          <div className="cht-stat-val" style={{ color: ungradedCount > 0 ? "#b91c1c" : "#7b1113" }}>{ungradedCount}</div>
          <div className="cht-stat-lbl">Needs Grading</div>
        </div>
        <div className="cht-stat" onClick={() => onTabChange("People")} style={{ cursor: "pointer" }}>
          <div className="cht-stat-val">{peopleCount}</div>
          <div className="cht-stat-lbl">Members Enrolled</div>
        </div>
        <div className="cht-stat">
          <div className="cht-stat-val">{upcomingDue}</div>
          <div className="cht-stat-lbl">Due This Week</div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Quick Actions</p>
        <div style={{ display: "flex", gap: 10 }}>
          {canManageAnnouncements && (
            <button className="cht-qa" onClick={() => onTabChange("Announcements")}>
              <div className="cht-qa-icon"><AnnouncementIcon /></div>
              <span className="cht-qa-lbl">Post Announcement</span>
            </button>
          )}
          {canManageAssignments && (
            <button className="cht-qa" onClick={() => onTabChange("Assignments")}>
              <div className="cht-qa-icon"><AssignmentIcon /></div>
              <span className="cht-qa-lbl">Create Assignment</span>
            </button>
          )}
          {canManageAssignments && (
            <button className="cht-qa" onClick={() => onTabChange("Quizzes")}>
              <div className="cht-qa-icon"><QuizIcon /></div>
              <span className="cht-qa-lbl">Create Quiz / Form</span>
            </button>
          )}
          {canManagePeople && (
            <button className="cht-qa" onClick={() => onTabChange("People")}>
              <div className="cht-qa-icon"><PeopleIcon /></div>
              <span className="cht-qa-lbl">Manage People</span>
            </button>
          )}
          <button className="cht-qa" onClick={() => onTabChange("Grades")}>
            <div className="cht-qa-icon"><GradeIcon /></div>
            <span className="cht-qa-lbl">View Grades</span>
          </button>
          <button className="cht-qa" onClick={() => onTabChange("Settings")}>
            <div className="cht-qa-icon"><SettingsIcon /></div>
            <span className="cht-qa-lbl">Course Settings</span>
          </button>
        </div>
      </div>

      {/* ── Two-column grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Upcoming Due */}
        <div className="cht-card">
          <div className="cht-card-header">
            <span className="cht-card-title">📅 Upcoming Due Dates</span>
            <button className="cht-card-link" onClick={() => onTabChange("Assignments")}>View all</button>
          </div>
          {upcomingAssignments.length === 0 ? (
            <div className="cht-empty">
              <span style={{ fontSize: 22 }}>✅</span>
              <span>No upcoming due dates</span>
            </div>
          ) : (
            upcomingAssignments.map((a) => {
              const daysLeft = a.dueDate ? Math.ceil((new Date(a.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
              const isUrgent = daysLeft !== null && daysLeft <= 2;
              return (
                <div key={a.id} className="cht-row">
                  <div className="cht-row-icon" style={{ background: "#fef2f2" }}>
                    <span style={{ color: MAROON }}><AssignmentIcon /></span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cht-row-title" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</div>
                    <div className="cht-row-sub">{a.assignmentGroup} · {a.points} pts</div>
                  </div>
                  <div className="cht-row-right">
                    <div style={{ fontSize: 11, fontWeight: 700, color: isUrgent ? "#b91c1c" : "#6b7280" }}>
                      {daysLeft === 0 ? "Due today" : daysLeft === 1 ? "Due tomorrow" : `${daysLeft}d left`}
                    </div>
                    <div style={{ fontSize: 10, color: "#9ca3af" }}>{fmtDue(a.dueDate)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Recent Announcements */}
        <div className="cht-card">
          <div className="cht-card-header">
            <span className="cht-card-title">📢 Recent Announcements</span>
            <button className="cht-card-link" onClick={() => onTabChange("Announcements")}>View all</button>
          </div>
          {recentAnnouncements.length === 0 ? (
            <div className="cht-empty">
              <span style={{ fontSize: 22 }}>📭</span>
              <span>No announcements yet</span>
            </div>
          ) : (
            recentAnnouncements.map((a) => (
              <div key={a.id} className="cht-row">
                <div className="cht-row-icon" style={{ background: "#fef2f2" }}>
                  <span style={{ color: MAROON }}><AnnouncementIcon /></span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cht-row-title" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</div>
                  <div className="cht-row-sub">To: {a.recipientsLabel}</div>
                </div>
                <div className="cht-row-right">
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>{fmtDate(a.createdAt)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Unpublished Assignments */}
        <div className="cht-card">
          <div className="cht-card-header">
            <span className="cht-card-title">🔒 Unpublished Assignments</span>
            <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{unpublishedAssignments.length} draft{unpublishedAssignments.length !== 1 ? "s" : ""}</span>
          </div>
          {unpublishedAssignments.length === 0 ? (
            <div className="cht-empty">
              <span style={{ fontSize: 22 }}>🎉</span>
              <span>All assignments are published</span>
            </div>
          ) : (
            unpublishedAssignments.map((a) => (
              <div key={a.id} className="cht-row" style={{ cursor: "pointer" }} onClick={() => onTabChange("Assignments")}>
                <div className="cht-row-icon" style={{ background: "#f9fafb" }}>
                  <span style={{ color: "#9ca3af" }}><AssignmentIcon /></span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cht-row-title" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#6b7280" }}>{a.title}</div>
                  <div className="cht-row-sub">{a.points} pts · {a.assignmentGroup}</div>
                </div>
                <span className="cht-row-badge" style={{ background: "#f9fafb", color: "#6b7280", border: "1px solid #e5e7eb" }}>Draft</span>
              </div>
            ))
          )}
        </div>

        {/* Published Progress + Groups */}
        <div className="cht-card">
          <div className="cht-card-header">
            <span className="cht-card-title">📊 Course Overview</span>
          </div>
          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Published progress */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Assignment Publishing</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: MAROON }}>{publishedAssignments}/{totalAssignments} published</span>
              </div>
              <div className="cht-bar-bg">
                <div className="cht-bar-fill" style={{ width: totalAssignments > 0 ? `${(publishedAssignments / totalAssignments) * 100}%` : "0%" }} />
              </div>
            </div>

            {/* Announcement count */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#fdf8f8", borderRadius: 10, border: "1px solid #f0e4e4" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Total Announcements</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: MAROON }}>{announcements.length}</span>
            </div>

            {/* Groups */}
            {groups.length > 0 && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Course Groups</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {groups.slice(0, 6).map((g) => (
                    <span key={g.id} style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: "#fef2f2", color: MAROON, border: "1px solid #f0c0c0" }}>
                      {g.name} · {g.memberCount}
                    </span>
                  ))}
                  {groups.length > 6 && (
                    <span style={{ fontSize: 11, color: "#9ca3af", padding: "4px 6px" }}>+{groups.length - 6} more</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STAFF HOME VIEW
───────────────────────────────────────────────────────────────────────────── */
function StaffHomeView({
  course, courseId, groups, onTabChange,
}: {
  course: Course; courseId: string; groups: Group[]; onTabChange: (tab: string) => void;
}) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/courses/${courseId}/assignments`).then((r) => r.json()).catch(() => ({ assignments: [] })),
      fetch(`/api/courses/${courseId}/announcements`).then((r) => r.json()).catch(() => ({ announcements: [] })),
    ]).then(([aData, anData]) => {
      setAssignments(aData.assignments ?? []);
      const raw = anData.announcements ?? anData.items ?? anData.data ?? [];
      setAnnouncements(raw.map((item: RawAnnouncement, i: number) => normalizeAnnouncement(item, i)));
      setLoading(false);
    });
  }, [courseId]);

  const now = new Date();

  // Upcoming assignments (next 7 days)
  const upcoming = assignments
    .filter((a) => a.dueDate && new Date(a.dueDate) >= now)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  // Past due / submitted
  const submitted = assignments.filter((a) => (a.submissions ?? []).some((s) => s.submittedAt));
  const totalPoints = assignments.reduce((sum, a) => sum + (a.points || 0), 0);
  const earnedPoints = assignments.reduce((sum, a) => {
    const sub = (a.submissions ?? [])[0];
    return sum + (sub?.grade ?? 0);
  }, 0);

  // Recent announcements
  const recentAnnouncements = announcements.slice(0, 3);
  const unreadCount = announcements.filter((a) => !a.read).length;

  // My groups
  const myGroups = groups.filter((g) => g.isMember);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "#9ca3af", fontSize: 13, fontFamily: FONT }}>
        Loading…
      </div>
    );
  }

  return (
    <div className="cht-root cht-fade" style={{ padding: "24px 28px", maxWidth: 960 }}>

      {/* ── Welcome Banner ── */}
      <div className="cht-welcome" style={{ marginBottom: 24 }}>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: 0 }}>{course.name}</h1>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,.18)", color: "#fff" }}>Staff</span>
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.75)", margin: 0 }}>
            {course.code}{course.term ? ` · ${course.term}` : ""}
            {course.status === "published" ? " · Published" : " · Unpublished"}
          </p>
          <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{submitted.length}<span style={{ fontSize: 14, opacity: 0.7 }}>/{assignments.length}</span></div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.6)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Submitted</div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,.2)" }} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0}<span style={{ fontSize: 14, opacity: 0.7 }}>%</span></div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.6)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Grade</div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,.2)" }} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{unreadCount}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.6)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Unread</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Nav ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Assignments", tab: "Assignments", icon: <AssignmentIcon /> },
          { label: "Quizzes", tab: "Quizzes", icon: <QuizIcon /> },
          { label: "Announcements", tab: "Announcements", icon: <AnnouncementIcon /> },
          { label: "Grades", tab: "Grades", icon: <GradeIcon /> },
        ].map((item) => (
          <button key={item.tab} className="cht-qa" onClick={() => onTabChange(item.tab)}>
            <div className="cht-qa-icon">{item.icon}</div>
            <span className="cht-qa-lbl">{item.label}</span>
          </button>
        ))}
      </div>

      {/* ── Main content grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* What's Due Soon */}
        <div className="cht-card">
          <div className="cht-card-header">
            <span className="cht-card-title">📋 What&apos;s Due Soon</span>
            <button className="cht-card-link" onClick={() => onTabChange("Assignments")}>View all</button>
          </div>
          {upcoming.length === 0 ? (
            <div className="cht-empty">
              <span style={{ fontSize: 22 }}>🎉</span>
              <span>No upcoming due dates!</span>
            </div>
          ) : (
            upcoming.map((a) => {
              const sub = (a.submissions ?? [])[0];
              const isSubmitted = !!sub?.submittedAt;
              const daysLeft = a.dueDate ? Math.ceil((new Date(a.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
              const isUrgent = daysLeft !== null && daysLeft <= 2 && !isSubmitted;

              return (
                <div key={a.id} className="cht-row" style={{ cursor: "pointer" }}
                  onClick={() => router.push(`/courses/${courseId}/assignments/${a.id}`)}>
                  <div className="cht-row-icon" style={{ background: isSubmitted ? "#f0fdf4" : isUrgent ? "#fef2f2" : "#fdf8f8" }}>
                    <span style={{ color: isSubmitted ? "#15803d" : MAROON }}><AssignmentIcon /></span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cht-row-title" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</div>
                    <div className="cht-row-sub">{a.points} pts · Due {fmtDue(a.dueDate)}</div>
                  </div>
                  <div className="cht-row-right">
                    {isSubmitted ? (
                      <span className="cht-row-badge" style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>✓ Submitted</span>
                    ) : (
                      <span className="cht-row-badge" style={{ background: isUrgent ? "#fef2f2" : "#f9fafb", color: isUrgent ? "#b91c1c" : "#6b7280", border: `1px solid ${isUrgent ? "#f0c0c0" : "#e5e7eb"}` }}>
                        {daysLeft === 0 ? "Today" : daysLeft === 1 ? "Tomorrow" : `${daysLeft}d`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Recent Announcements */}
        <div className="cht-card">
          <div className="cht-card-header">
            <span className="cht-card-title">
              📢 Announcements
              {unreadCount > 0 && (
                <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 20, background: MAROON, color: "#fff" }}>
                  {unreadCount} new
                </span>
              )}
            </span>
            <button className="cht-card-link" onClick={() => onTabChange("Announcements")}>View all</button>
          </div>
          {recentAnnouncements.length === 0 ? (
            <div className="cht-empty">
              <span style={{ fontSize: 22 }}>📭</span>
              <span>No announcements yet</span>
            </div>
          ) : (
            recentAnnouncements.map((a) => (
              <div key={a.id} className="cht-row" style={{ cursor: "pointer" }} onClick={() => onTabChange("Announcements")}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.read ? "transparent" : MAROON, flexShrink: 0, marginTop: 4, border: a.read ? "1px solid #e5e7eb" : "none" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="cht-row-title" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: a.read ? 500 : 700 }}>{a.title}</div>
                  <div className="cht-row-sub">{a.authorName} · {fmtDate(a.createdAt)}</div>
                  {a.body && (
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {a.body.slice(0, 60)}{a.body.length > 60 ? "…" : ""}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* My Progress */}
        <div className="cht-card">
          <div className="cht-card-header">
            <span className="cht-card-title">📈 My Progress</span>
            <button className="cht-card-link" onClick={() => onTabChange("Grades")}>View grades</button>
          </div>
          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Submission progress */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Submissions</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: MAROON }}>{submitted.length}/{assignments.length}</span>
              </div>
              <div className="cht-bar-bg">
                <div className="cht-bar-fill" style={{ width: assignments.length > 0 ? `${(submitted.length / assignments.length) * 100}%` : "0%" }} />
              </div>
            </div>

            {/* Grade overview */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Overall Grade</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: MAROON }}>
                  {earnedPoints} / {totalPoints} pts
                </span>
              </div>
              <div className="cht-bar-bg">
                <div className="cht-bar-fill" style={{ width: totalPoints > 0 ? `${Math.min((earnedPoints / totalPoints) * 100, 100)}%` : "0%" }} />
              </div>
            </div>

            {/* Recent grades */}
            {assignments.filter((a) => (a.submissions ?? [])[0]?.grade != null).slice(0, 3).map((a) => {
              const sub = (a.submissions ?? [])[0];
              const pct = Math.round(((sub?.grade ?? 0) / a.points) * 100);
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#fdf8f8", borderRadius: 8, border: "1px solid #f0e4e4" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>{a.title}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: pct >= 75 ? "#15803d" : pct >= 50 ? "#b45309" : "#b91c1c" }}>
                    {sub?.grade} / {a.points} <span style={{ fontWeight: 500, color: "#9ca3af" }}>({pct}%)</span>
                  </span>
                </div>
              );
            })}

            {assignments.filter((a) => (a.submissions ?? [])[0]?.grade != null).length === 0 && (
              <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center" }}>No grades yet</p>
            )}
          </div>
        </div>

        {/* My Groups */}
        <div className="cht-card">
          <div className="cht-card-header">
            <span className="cht-card-title">👥 My Groups</span>
          </div>
          {myGroups.length === 0 ? (
            <div className="cht-empty">
              <span style={{ fontSize: 22 }}>🔍</span>
              <span>You are not in any group yet</span>
            </div>
          ) : (
            myGroups.map((g) => (
              <div key={g.id} className="cht-row" style={{ cursor: "pointer" }}
                onClick={() => router.push(`/courses/${courseId}/groups/${g.id}`)}>
                <div className="cht-row-icon" style={{ background: "#fef2f2" }}>
                  <span style={{ color: MAROON }}><PeopleIcon /></span>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="cht-row-title">{g.name}</div>
                  <div className="cht-row-sub">{g.memberCount} member{g.memberCount !== 1 ? "s" : ""} · {g.groupSetName}</div>
                </div>
                <span style={{ fontSize: 11, color: MAROON, fontWeight: 700 }}>Visit →</span>
              </div>
            ))
          )}

          {/* Course image */}
          {course.image && myGroups.length === 0 && (
            <div style={{ padding: "0 18px 18px" }}>
              <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #f0e4e4", height: 120 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={course.image} alt={course.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────────────────────── */
export default function CourseHomeTab({
  course,
  membership,
  groups,
  courseId,
  canManageAnnouncements,
  canManageAssignments,
  canManagePeople,
  canManageCourse,
  isHead,
  onTabChange,
}: Props) {
  if (isHead) {
    return (
      <>
        <style>{CSS}</style>
        <HeadHomeView
          course={course}
          courseId={courseId}
          groups={groups}
          canManageAnnouncements={canManageAnnouncements}
          canManageAssignments={canManageAssignments}
          canManagePeople={canManagePeople}
          onTabChange={onTabChange}
        />
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <StaffHomeView
        course={course}
        courseId={courseId}
        groups={groups}
        onTabChange={onTabChange}
      />
    </>
  );
}