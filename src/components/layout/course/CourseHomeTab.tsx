"use client";

// src/components/layout/course/CourseHomeTab.tsx

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MAROON, FONT,
  fmtDate, fmtDue, normalizeAnnouncement,
} from "./helpers";
import type {
  Course, Membership, Group,
  Assignment as BaseAssignment, Announcement, RawAnnouncement,
} from "./types";

// ✅ Fix: extend the imported Assignment type to include createdById
type Assignment = BaseAssignment & { createdById?: string; status?: string };

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
  currentUserId: string;
  onTabChange: (tab: string) => void;
}

/* ─────────────────────────────────────────────────────────────────────────────
   CSS
───────────────────────────────────────────────────────────────────────────── */
const CSS = `
  .ch-root * { box-sizing: border-box; }
  .ch-root {
    font-family: 'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif;
    color: #111827;
    background: #f8f9fa;
    min-height: 100vh;
  }

  @keyframes ch-fade {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: none; }
  }
  .ch-fade { animation: ch-fade .3s ease both; }

  /* ── Header ── */
  .ch-header {
    background: #fff;
    border-bottom: 1px solid #e5e7eb;
    padding: 20px 28px 16px;
  }
  .ch-header-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .ch-course-name {
    font-size: 22px;
    font-weight: 800;
    color: #111827;
    margin: 0 0 4px;
  }
  .ch-course-meta {
    font-size: 12px;
    color: #6b7280;
    font-weight: 500;
  }
  .ch-role-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 999px;
    padding: 4px 12px;
    font-size: 11px;
    font-weight: 700;
  }

  /* ── View switcher tabs (Head only) ── */
  .ch-view-tabs {
    display: flex;
    border-bottom: 2px solid #e5e7eb;
    background: #fff;
    padding: 0 28px;
  }
  .ch-view-tab {
    padding: 10px 18px;
    font-size: 12px;
    font-weight: 700;
    color: #6b7280;
    cursor: pointer;
    border: none;
    background: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: color .15s, border-color .15s;
    letter-spacing: .02em;
  }
  .ch-view-tab.active { color: #7b1113; border-bottom-color: #7b1113; }
  .ch-view-tab:hover:not(.active) { color: #374151; }

  /* ── Body ── */
  .ch-body { padding: 20px 28px 32px; max-width: 1080px; }

  /* ── Section title ── */
  .ch-section-title {
    font-size: 10px;
    font-weight: 800;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: .09em;
    margin: 0 0 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ch-section-title::after { content: ''; flex: 1; height: 1px; background: #e5e7eb; }

  /* ── KPI strip ── */
  .ch-kpi-strip { display: grid; gap: 12px; margin-bottom: 20px; }
  .ch-kpi {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 16px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    transition: box-shadow .18s, border-color .18s;
  }
  .ch-kpi.clickable { cursor: pointer; }
  .ch-kpi.clickable:hover { border-color: #f0c0c0; box-shadow: 0 4px 14px rgba(123,17,19,.08); }
  .ch-kpi-icon {
    width: 38px; height: 38px; border-radius: 10px; background: #fef2f2;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .ch-kpi-val { font-size: 24px; font-weight: 800; color: #7b1113; line-height: 1; }
  .ch-kpi-lbl { font-size: 11px; font-weight: 600; color: #6b7280; margin-top: 2px; }

  /* ── Quick actions ── */
  .ch-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .ch-action-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 9px 14px; background: #fff; border: 1px solid #e5e7eb;
    border-radius: 10px; font-size: 12px; font-weight: 700; color: #374151;
    cursor: pointer; transition: all .15s;
  }
  .ch-action-btn:hover { background: #fdf8f8; border-color: #f0c0c0; color: #7b1113; }

  /* ── Card ── */
  .ch-card {
    background: #fff; border: 1px solid #e5e7eb;
    border-radius: 12px; overflow: hidden; margin-bottom: 12px;
  }
  .ch-card-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; border-bottom: 1px solid #f3f4f6;
  }
  .ch-card-title {
    font-size: 12px; font-weight: 800; color: #374151;
    display: flex; align-items: center; gap: 7px;
    text-transform: uppercase; letter-spacing: .06em;
  }
  .ch-card-link {
    font-size: 11px; font-weight: 700; color: #7b1113;
    background: none; border: none; cursor: pointer; opacity: .7; transition: opacity .15s;
  }
  .ch-card-link:hover { opacity: 1; text-decoration: underline; }

  /* ── Rows ── */
  .ch-row {
    display: flex; align-items: center; gap: 11px;
    padding: 10px 16px; border-bottom: 1px solid #f9fafb; transition: background .1s;
  }
  .ch-row:last-child { border-bottom: none; }
  .ch-row.clickable { cursor: pointer; }
  .ch-row.clickable:hover { background: #fafafa; }
  .ch-row-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .ch-row-icon {
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .ch-row-title {
    font-size: 13px; font-weight: 600; color: #111827;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .ch-row-sub { font-size: 11px; color: #9ca3af; margin-top: 1px; }
  .ch-row-right { margin-left: auto; text-align: right; flex-shrink: 0; }

  /* ── Badge ── */
  .ch-badge {
    font-size: 10px; font-weight: 700; padding: 3px 8px;
    border-radius: 20px; display: inline-block; white-space: nowrap;
  }

  /* ── Progress bar ── */
  .ch-bar-track { height: 5px; background: #f3f4f6; border-radius: 99px; overflow: hidden; }
  .ch-bar-fill {
    height: 100%; border-radius: 99px;
    background: linear-gradient(90deg, #7b1113, #b91c1c); transition: width .5s ease;
  }

  /* ── Empty state ── */
  .ch-empty {
    padding: 28px 18px; text-align: center; font-size: 12px; color: #9ca3af;
    display: flex; flex-direction: column; align-items: center; gap: 5px;
  }

  /* ── Two-col grid ── */
  .ch-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  /* ── Info box ── */
  .ch-infobox {
    background: #fdf8f8; border: 1px solid #f0e4e4; border-radius: 10px;
    padding: 12px 14px; display: flex; align-items: center; justify-content: space-between;
    font-size: 12px; font-weight: 600; color: #374151;
  }
  .ch-infobox-val { font-size: 18px; font-weight: 800; color: #7b1113; }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   ICONS
───────────────────────────────────────────────────────────────────────────── */
const Icon = {
  Assignment: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="3" width="14" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  ),
  Announcement: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 7.535V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7.535" strokeLinecap="round" />
      <path d="M22 7 12 13 2 7" strokeLinecap="round" />
    </svg>
  ),
  People: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
    </svg>
  ),
  Grade: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Settings: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinecap="round" />
    </svg>
  ),
  Clock: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" strokeLinecap="round" />
    </svg>
  ),
  Chart: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round" />
      <line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round" />
      <line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round" />
    </svg>
  ),
  Form: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M12 13H8M16 17H8" strokeLinecap="round" />
    </svg>
  ),
};

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="ch-empty">
      <div style={{ fontSize: 22 }}>{emoji}</div>
      <div>{text}</div>
    </div>
  );
}

function ProgressRow({ label, current, total, unit = "" }: {
  label: string; current: number; total: number; unit?: string;
}) {
  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: MAROON }}>{current}{unit}/{total}{unit}</span>
      </div>
      <div className="ch-bar-track">
        <div className="ch-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function KpiCard({ value, label, icon, urgent = false, onClick }: {
  value: number | string; label: string; icon: React.ReactNode; urgent?: boolean; onClick?: () => void;
}) {
  return (
    <div className={`ch-kpi ${onClick ? "clickable" : ""}`} onClick={onClick}>
      <div className="ch-kpi-icon">
        <span style={{ color: urgent ? "#b91c1c" : MAROON }}>{icon}</span>
      </div>
      <div>
        <div className="ch-kpi-val" style={{ color: urgent ? "#b91c1c" : MAROON }}>{value}</div>
        <div className="ch-kpi-lbl">{label}</div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick }: {
  icon: React.ReactNode; label: string; onClick: () => void;
}) {
  return (
    <button className="ch-action-btn" onClick={onClick}>
      <span style={{ color: MAROON }}>{icon}</span>
      {label}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CARDS
───────────────────────────────────────────────────────────────────────────── */

function UpcomingDueCard({ assignments, now, courseId, onTabChange, isHead, headManagementView = false, currentUserId = "" }: {
  assignments: Assignment[]; now: Date; courseId: string;
  onTabChange: (t: string) => void; isHead: boolean;
  headManagementView?: boolean; currentUserId?: string;
}) {
  const router = useRouter();

  const sourceAssignments = headManagementView && currentUserId
    ? assignments.filter((a) => a.createdById === currentUserId)
    : assignments;

  const upcoming = sourceAssignments
    .filter((a) => a.dueDate && new Date(a.dueDate) >= now)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  return (
    <div className="ch-card">
      <div className="ch-card-head">
        <span className="ch-card-title"><Icon.Clock /> Upcoming Due Dates</span>
        <button className="ch-card-link" onClick={() => onTabChange("Assignments")}>View all →</button>
      </div>
      {upcoming.length === 0 ? (
        <EmptyState emoji="✅" text="No upcoming due dates" />
      ) : (
        upcoming.map((a) => {
          const daysLeft = a.dueDate
            ? Math.ceil((new Date(a.dueDate).getTime() - now.getTime()) / 86400000)
            : null;
          const urgent = daysLeft !== null && daysLeft <= 2;
          const sub = (a.submissions ?? [])[0];
          const submitted = !!sub?.submittedAt;
          return (
            <div
              key={a.id}
              className="ch-row clickable"
              onClick={() => isHead ? onTabChange("Assignments") : router.push(`/courses/${courseId}/assignments/${a.id}`)}
            >
              <div className="ch-row-icon" style={{ background: submitted ? "#f0fdf4" : urgent ? "#fef2f2" : "#f9fafb" }}>
                <span style={{ color: submitted ? "#15803d" : MAROON }}><Icon.Assignment /></span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ch-row-title">{a.title}</div>
                <div className="ch-row-sub">{a.assignmentGroup} · {a.points} pts</div>
              </div>
              <div className="ch-row-right">
                {submitted ? (
                  <span className="ch-badge" style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }}>✓ Submitted</span>
                ) : (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: urgent ? "#b91c1c" : "#6b7280" }}>
                      {daysLeft === 0 ? "Due today" : daysLeft === 1 ? "Tomorrow" : `${daysLeft}d left`}
                    </div>
                    <div style={{ fontSize: 10, color: "#9ca3af" }}>{fmtDue(a.dueDate)}</div>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function AnnouncementsCard({ announcements, onTabChange }: {
  announcements: Announcement[]; onTabChange: (t: string) => void;
}) {
  const unread = announcements.filter((a) => !a.read).length;
  return (
    <div className="ch-card">
      <div className="ch-card-head">
        <span className="ch-card-title">
          <Icon.Announcement /> Announcements
          {unread > 0 && (
            <span className="ch-badge" style={{ background: MAROON, color: "#fff", fontSize: 9 }}>{unread} new</span>
          )}
        </span>
        <button className="ch-card-link" onClick={() => onTabChange("Announcements")}>View all →</button>
      </div>
      {announcements.length === 0 ? (
        <EmptyState emoji="📭" text="No announcements yet" />
      ) : (
        announcements.slice(0, 5).map((a) => (
          <div key={a.id} className="ch-row clickable" onClick={() => onTabChange("Announcements")}>
            <div className="ch-row-dot" style={{ background: a.read ? "transparent" : MAROON, border: a.read ? "1.5px solid #e5e7eb" : "none" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ch-row-title" style={{ fontWeight: a.read ? 500 : 700 }}>{a.title}</div>
              <div className="ch-row-sub">{a.authorName} · {fmtDate(a.createdAt)}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function MyProgressCard({ assignments, onTabChange }: {
  assignments: Assignment[]; onTabChange: (t: string) => void;
}) {
  const submitted = assignments.filter((a) => (a.submissions ?? [])[0]?.submittedAt);
  const totalPts = assignments.reduce((s, a) => s + (a.points || 0), 0);
  const earnedPts = assignments.reduce((s, a) => s + ((a.submissions ?? [])[0]?.grade ?? 0), 0);
  const graded = assignments.filter((a) => (a.submissions ?? [])[0]?.grade != null);
  return (
    <div className="ch-card">
      <div className="ch-card-head">
        <span className="ch-card-title"><Icon.Chart /> My Progress</span>
        <button className="ch-card-link" onClick={() => onTabChange("Grades")}>View grades →</button>
      </div>
      <div style={{ padding: "14px 16px" }}>
        <ProgressRow label="Submissions" current={submitted.length} total={assignments.length} />
        <ProgressRow label="Overall Grade" current={earnedPts} total={totalPts} unit=" pts" />
        {graded.length > 0 && (
          <>
            <p style={{ fontSize: 10, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".08em", margin: "10px 0 8px" }}>
              Recent Grades
            </p>
            {graded.slice(0, 3).map((a) => {
              const grade = (a.submissions ?? [])[0]?.grade ?? 0;
              const pct = a.points > 0 ? Math.round((grade / a.points) * 100) : 0;
              const color = pct >= 75 ? "#15803d" : pct >= 50 ? "#b45309" : "#b91c1c";
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: "#fafafa", borderRadius: 8, border: "1px solid #f3f4f6", marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "58%" }}>{a.title}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color }}>{grade}/{a.points}<span style={{ fontWeight: 500, color: "#9ca3af" }}> ({pct}%)</span></span>
                </div>
              );
            })}
          </>
        )}
        {graded.length === 0 && <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", marginTop: 8 }}>No grades yet</p>}
      </div>
    </div>
  );
}

function MyGroupsCard({ groups, courseId }: { groups: Group[]; courseId: string }) {
  const router = useRouter();
  const myGroups = groups.filter((g) => g.isMember);
  return (
    <div className="ch-card">
      <div className="ch-card-head">
        <span className="ch-card-title"><Icon.People /> My Groups</span>
      </div>
      {myGroups.length === 0 ? (
        <EmptyState emoji="🔍" text="You are not in any group yet" />
      ) : (
        myGroups.map((g) => (
          <div key={g.id} className="ch-row clickable" onClick={() => router.push(`/courses/${courseId}/groups/${g.id}`)}>
            <div className="ch-row-icon" style={{ background: "#fef2f2" }}>
              <span style={{ color: MAROON }}><Icon.People /></span>
            </div>
            <div style={{ flex: 1 }}>
              <div className="ch-row-title">{g.name}</div>
              <div className="ch-row-sub">{g.memberCount} member{g.memberCount !== 1 ? "s" : ""} · {g.groupSetName}</div>
            </div>
            <span style={{ fontSize: 11, color: MAROON, fontWeight: 700 }}>Visit →</span>
          </div>
        ))
      )}
    </div>
  );
}

function UnitOverviewCard({ allAssignments, currentUserId, announcements, groups }: {
  allAssignments: Assignment[]; currentUserId: string;
  announcements: number; groups: Group[];
}) {
  const myAssignments = allAssignments.filter((a) => a.createdById === currentUserId);
  const myPublished   = myAssignments.filter((a) => a.status === "PUBLISHED").length;
  const myTotal       = myAssignments.length;

  return (
    <div className="ch-card">
      <div className="ch-card-head">
        <span className="ch-card-title"><Icon.Chart /> Unit Overview</span>
      </div>
      <div style={{ padding: "14px 16px" }}>
        <ProgressRow label="My Assignments Published" current={myPublished} total={myTotal} />
        <div className="ch-infobox" style={{ marginTop: 10, marginBottom: groups.length > 0 ? 14 : 0 }}>
          <span>Total Announcements</span>
          <span className="ch-infobox-val">{announcements}</span>
        </div>
        {groups.length > 0 && (
          <>
            <p style={{ fontSize: 10, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Unit Groups</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {groups.slice(0, 6).map((g) => (
                <span key={g.id} style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: "#fef2f2", color: MAROON, border: "1px solid #f0c0c0" }}>
                  {g.name} · {g.memberCount}
                </span>
              ))}
              {groups.length > 6 && <span style={{ fontSize: 11, color: "#9ca3af", padding: "4px 6px" }}>+{groups.length - 6} more</span>}
            </div>
          </>
        )}
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
  currentUserId = "",
  onTabChange,
}: Props) {
  void membership;
  void canManageCourse;

  const [headView, setHeadView] = useState<"admin" | "staff">("admin");
  const [assignments, setAssignments]     = useState<Assignment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [peopleCount, setPeopleCount]     = useState(0);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    const base = `/api/courses/${courseId}`;
    Promise.all([
      fetch(`${base}/assignments`).then((r) => r.json()).catch(() => ({ assignments: [] })),
      fetch(`${base}/announcements`).then((r) => r.json()).catch(() => ({ announcements: [] })),
      fetch(`${base}/people`).then((r) => r.json()).catch(() => ({ people: [] })),
    ]).then(([aData, anData, pData]) => {
      setAssignments(aData.assignments ?? []);
      const raw = anData.announcements ?? anData.items ?? anData.data ?? [];
      setAnnouncements(raw.map((item: RawAnnouncement, i: number) => normalizeAnnouncement(item, i)));
      setPeopleCount((pData.people ?? []).length);
      setLoading(false);
    });
  }, [courseId]);

  const now = new Date();

  // ── Only count assignments created by the current user for head's KPIs ──
  const myCreatedAssignments = assignments.filter((a) => a.createdById === currentUserId);
  const myPublishedCount     = myCreatedAssignments.filter((a) => a.status === "PUBLISHED").length;

  const totalAssignments = assignments.length;

  const ungradedCount = myCreatedAssignments.filter((a) =>
    (a.submissions ?? []).some((s) => s.status === "SUBMITTED" && s.grade == null)
  ).length;

  // ✅ FIX: Due This Week for head = only their own created assignments
  const dueThisWeekHead = myCreatedAssignments.filter((a) =>
    a.dueDate && new Date(a.dueDate) > now && new Date(a.dueDate) <= new Date(now.getTime() + 7 * 86400000)
  ).length;

  // Due This Week for staff/student = all assignments in the unit
  const dueThisWeekAll = assignments.filter((a) =>
    a.dueDate && new Date(a.dueDate) > now && new Date(a.dueDate) <= new Date(now.getTime() + 7 * 86400000)
  ).length;

  const mySubmitted  = assignments.filter((a) => (a.submissions ?? [])[0]?.submittedAt).length;
  const myTotalPts   = assignments.reduce((s, a) => s + (a.points || 0), 0);
  const myEarnedPts  = assignments.reduce((s, a) => s + ((a.submissions ?? [])[0]?.grade ?? 0), 0);
  const myGradePct   = myTotalPts > 0 ? Math.round((myEarnedPts / myTotalPts) * 100) : 0;
  const unreadCount  = announcements.filter((a) => !a.read).length;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 220, color: "#9ca3af", fontSize: 13, fontFamily: FONT, gap: 10 }}>
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 60" />
        </svg>
        Loading dashboard…
      </div>
    );
  }

  /* ── HEAD ── */
  if (isHead) {
    return (
      <>
        <style>{CSS}</style>
        <div className="ch-root ch-fade">

          {/* Header */}
          <div className="ch-header">
            <div className="ch-header-top">
              <div>
                <h1 className="ch-course-name">{course.name}</h1>
                <span className="ch-course-meta">{course.code}{course.term ? ` · ${course.term}` : ""}</span>
              </div>
              <span className="ch-role-badge" style={{ background: "#fef2f2", color: MAROON, border: "1px solid #f0c0c0" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: MAROON, display: "inline-block" }} />
                Head
              </span>
            </div>
          </div>

          {/* View switcher */}
          <div className="ch-view-tabs">
            <button className={`ch-view-tab ${headView === "admin" ? "active" : ""}`} onClick={() => setHeadView("admin")}>
              Unit Management
            </button>
            <button className={`ch-view-tab ${headView === "staff" ? "active" : ""}`} onClick={() => setHeadView("staff")}>
              My Dashboard
            </button>
          </div>

          {/* UNIT MANAGEMENT VIEW */}
          {headView === "admin" && (
            <div className="ch-body">
              <p className="ch-section-title">Unit Overview</p>
              <div className="ch-kpi-strip" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <KpiCard
                  value={myCreatedAssignments.length}
                  label={`My Assignments (${myPublishedCount} published)`}
                  icon={<Icon.Assignment />}
                  onClick={() => onTabChange("Assignments")}
                />
                <KpiCard value={ungradedCount} label="Needs Grading" icon={<Icon.Grade />} urgent={ungradedCount > 0} onClick={() => onTabChange("Assignments")} />
                <KpiCard value={peopleCount} label="Members Enrolled" icon={<Icon.People />} onClick={() => onTabChange("People")} />
                <KpiCard value={dueThisWeekHead} label="Due This Week" icon={<Icon.Clock />} />
              </div>

              <p className="ch-section-title">Quick Actions</p>
              <div className="ch-actions" style={{ marginBottom: 20 }}>
                {canManageAnnouncements && <ActionBtn icon={<Icon.Announcement />} label="Post Announcement" onClick={() => onTabChange("Announcements")} />}
                {canManageAssignments && <ActionBtn icon={<Icon.Assignment />} label="Create Assignment" onClick={() => onTabChange("Assignments")} />}
                {canManageAssignments && <ActionBtn icon={<Icon.Form />} label="Create Form" onClick={() => onTabChange("Quizzes")} />}
{canManageAssignments && <ActionBtn icon={<Icon.Form />} label="Create Form (Survey)" onClick={() => onTabChange("Forms")} />}
                {canManagePeople && <ActionBtn icon={<Icon.People />} label="Manage People" onClick={() => onTabChange("People")} />}
                <ActionBtn icon={<Icon.Settings />} label="Settings" onClick={() => onTabChange("Settings")} />
              </div>

              <p className="ch-section-title">At a Glance</p>
              <div className="ch-grid-2">
                <div>
                  <UpcomingDueCard
                    assignments={assignments}
                    now={now}
                    courseId={courseId}
                    onTabChange={onTabChange}
                    isHead={true}
                    headManagementView={true}
                    currentUserId={currentUserId}
                  />
                  <AnnouncementsCard announcements={announcements} onTabChange={onTabChange} />
                </div>
                <div>
                  <UnitOverviewCard
                    allAssignments={assignments}
                    currentUserId={currentUserId}
                    announcements={announcements.length}
                    groups={groups}
                  />
                </div>
              </div>
            </div>
          )}

          {/* MY DASHBOARD VIEW */}
          {headView === "staff" && (
            <div className="ch-body">
              <p className="ch-section-title">My Status</p>
              <div className="ch-kpi-strip" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <KpiCard value={`${mySubmitted}/${totalAssignments}`} label="Submitted" icon={<Icon.Assignment />} />
                <KpiCard value={`${myGradePct}%`} label="Current Grade" icon={<Icon.Chart />} />
                <KpiCard value={unreadCount} label="Unread Announcements" icon={<Icon.Announcement />} urgent={unreadCount > 0} />
                <KpiCard value={dueThisWeekAll} label="Due This Week" icon={<Icon.Clock />} urgent={dueThisWeekAll > 0} />
              </div>

              <p className="ch-section-title">Quick Actions</p>
              <div className="ch-actions" style={{ marginBottom: 20 }}>
                <ActionBtn icon={<Icon.Grade />} label="View My Grades" onClick={() => onTabChange("Grades")} />
                <ActionBtn icon={<Icon.Announcement />} label="Announcements" onClick={() => onTabChange("Announcements")} />
                <ActionBtn icon={<Icon.Assignment />} label="My Assignments" onClick={() => onTabChange("Assignments")} />
              </div>

              <p className="ch-section-title">At a Glance</p>
              <div className="ch-grid-2">
                <div>
                  <UpcomingDueCard
                    assignments={assignments}
                    now={now}
                    courseId={courseId}
                    onTabChange={onTabChange}
                    isHead={true}
                  />
                  <AnnouncementsCard announcements={announcements} onTabChange={onTabChange} />
                </div>
                <div>
                  <MyProgressCard assignments={assignments} onTabChange={onTabChange} />
                  <MyGroupsCard groups={groups} courseId={courseId} />
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  /* ── STAFF (non-head) ── */
  return (
    <>
      <style>{CSS}</style>
      <div className="ch-root ch-fade">
        <div className="ch-header">
          <div className="ch-header-top">
            <div>
              <h1 className="ch-course-name">{course.name}</h1>
              <span className="ch-course-meta">{course.code}{course.term ? ` · ${course.term}` : ""}</span>
            </div>
            <span className="ch-role-badge" style={{ background: "#eff6ff", color: "#0369a1", border: "1px solid #bae6fd" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0369a1", display: "inline-block" }} />
              Staff
            </span>
          </div>
        </div>

        <div className="ch-body">
          <p className="ch-section-title">My Status</p>
          <div className="ch-kpi-strip" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            <KpiCard value={`${mySubmitted}/${totalAssignments}`} label="Submitted" icon={<Icon.Assignment />} />
            <KpiCard value={`${myGradePct}%`} label="Current Grade" icon={<Icon.Chart />} />
            <KpiCard value={unreadCount} label="Unread Announcements" icon={<Icon.Announcement />} urgent={unreadCount > 0} />
            <KpiCard value={dueThisWeekAll} label="Due This Week" icon={<Icon.Clock />} urgent={dueThisWeekAll > 0} />
          </div>

          <p className="ch-section-title">Quick Actions</p>
          <div className="ch-actions" style={{ marginBottom: 20 }}>
  <ActionBtn icon={<Icon.Grade />} label="View Grades" onClick={() => onTabChange("Grades")} />
  <ActionBtn icon={<Icon.Announcement />} label="Announcements" onClick={() => onTabChange("Announcements")} />
  <ActionBtn icon={<Icon.Assignment />} label="Assignments" onClick={() => onTabChange("Assignments")} />
  <ActionBtn icon={<Icon.Form />} label="Form" onClick={() => onTabChange("Form")} />
</div>

          <p className="ch-section-title">At a Glance</p>
          <div className="ch-grid-2">
            <div>
              <UpcomingDueCard assignments={assignments} now={now} courseId={courseId} onTabChange={onTabChange} isHead={false} />
              <AnnouncementsCard announcements={announcements} onTabChange={onTabChange} />
            </div>
            <div>
              <MyProgressCard assignments={assignments} onTabChange={onTabChange} />
              <MyGroupsCard groups={groups} courseId={courseId} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}