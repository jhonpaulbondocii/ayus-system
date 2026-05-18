"use client";
// src/components/admin/CourseHomePage.tsx

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const MAROON = "#7b1113";
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

interface Deadline {
  id: string;
  title: string;
  type: "assignment" | "form";
  dueDate: string;
  submissions: number;
  total: number;
}

interface GradingProgress {
  totalSubmissions: number;
  graded: number;
  ungraded: number;
  gradedPct: number;
  byAssignment: {
    id: string;
    title: string;
    submitted: number;
    graded: number;
    total: number;
  }[];
}

interface RecentEnrollment {
  id: string;
  name: string;
  image: string | null;
  role: string;
  joinedAt: string;
}

interface AnnouncementPreview {
  id: string;
  title: string;
  postedAt: string;
  author: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
const pct = (s: number, t: number) => (t > 0 ? Math.round((s / t) * 100) : 0);

function Avatar({ name, image, size = 30 }: { name: string; image: string | null; size?: number }) {
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
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "#f0e4e4", color: MAROON,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 800, flexShrink: 0,
    }}>
      {name?.[0]?.toUpperCase()}
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
  }

  /* ── Header ── */
  .chp-header {
    background: ${MAROON};
    padding: 0 24px;
    display: flex;
    align-items: flex-end;
    min-height: 110px;
    position: relative;
  }
  .chp-header-content {
    padding: 22px 0 0;
    flex: 1;
    min-width: 0;
  }
  .chp-header-eyebrow {
    font-size: 10px;
    font-weight: 800;
    color: rgba(255,255,255,.45);
    text-transform: uppercase;
    letter-spacing: .22em;
    margin: 0 0 6px;
  }
  .chp-header-title {
    font-size: clamp(16px, 4vw, 22px);
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
  .chp-header-tabs {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    margin-top: 16px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    flex-wrap: nowrap;
  }
  .chp-header-tabs::-webkit-scrollbar { display: none; }
  .chp-header-tab {
    font-size: 11px;
    font-weight: 700;
    color: rgba(255,255,255,.55);
    padding: 7px 14px 8px;
    border-radius: 8px 8px 0 0;
    background: transparent;
    border: none;
    cursor: pointer;
    letter-spacing: .02em;
    white-space: nowrap;
    transition: all .15s;
    flex-shrink: 0;
  }
  .chp-header-tab:hover { color: rgba(255,255,255,.85); }
  .chp-header-tab.active {
    background: #f1f1f0;
    color: ${MAROON};
    cursor: default;
  }

  /* ── Stat strip ── */
  .chp-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: #fff;
    border-bottom: 1px solid #e5e7eb;
  }
  .chp-stat {
    padding: 14px 16px;
    border-right: 1px solid #f0f0f0;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: default;
    transition: background .12s;
    min-width: 0;
  }
  .chp-stat:last-child { border-right: none; }
  .chp-stat:hover { background: #fafafa; }
  .chp-stat-icon {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .chp-stat-info { min-width: 0; }
  .chp-stat-value {
    font-size: clamp(16px, 3vw, 20px);
    font-weight: 900;
    line-height: 1;
  }
  .chp-stat-label {
    font-size: 10px;
    font-weight: 600;
    color: #9ca3af;
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ── Body ── */
  .chp-body {
    padding: 20px 20px 32px;
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 16px;
    align-items: start;
  }
  .chp-main { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .chp-side { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

  /* ── Card ── */
  .chp-card {
    background: #fff;
    border-radius: 12px;
    border: 1px solid #e9eaeb;
    overflow: hidden;
  }
  .chp-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px 0;
    gap: 8px;
  }
  .chp-card-title {
    font-size: 11px;
    font-weight: 800;
    color: #111827;
    text-transform: uppercase;
    letter-spacing: .1em;
    margin: 0;
  }
  .chp-card-action {
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
  .chp-card-action:hover { text-decoration: underline; }
  .chp-card-body { padding: 12px 18px 16px; }

  /* ── Quick actions ── */
  .chp-actions-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    padding: 14px 18px 16px;
  }
  .chp-action-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 14px;
    border-radius: 10px;
    border: 1px solid #e9eaeb;
    background: #fafafa;
    cursor: pointer;
    font-family: ${FONT};
    text-align: left;
    transition: all .14s;
    width: 100%;
    min-height: 52px;
  }
  .chp-action-btn:hover {
    border-color: ${MAROON};
    background: #fdf2f2;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(123,17,19,.08);
  }
  .chp-action-btn:active { transform: translateY(0); }
  .chp-action-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: #fdf2f2;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: ${MAROON};
  }
  .chp-action-label {
    font-size: 11.5px;
    font-weight: 700;
    color: #374151;
    line-height: 1.3;
  }

  /* ── Grading progress ── */
  .chp-grade-summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: #f0f0f0;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 14px;
  }
  .chp-grade-stat {
    background: #fff;
    padding: 12px 10px;
    text-align: center;
  }
  .chp-grade-stat-val {
    font-size: clamp(18px, 4vw, 22px);
    font-weight: 900;
    line-height: 1;
  }
  .chp-grade-stat-label {
    font-size: 10px;
    font-weight: 600;
    color: #9ca3af;
    margin-top: 3px;
  }
  .chp-grade-bar-wrap {
    height: 8px;
    background: #f3f4f6;
    border-radius: 99px;
    overflow: hidden;
    margin-bottom: 14px;
  }
  .chp-grade-bar-fill {
    height: 100%;
    border-radius: 99px;
    background: linear-gradient(90deg, ${MAROON}, #c0392b);
    transition: width .6s ease;
  }
  .chp-grade-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 0;
    border-bottom: 1px solid #f9fafb;
  }
  .chp-grade-row:last-child { border-bottom: none; }
  .chp-grade-row-title {
    flex: 1;
    min-width: 0;
    font-size: 11.5px;
    font-weight: 600;
    color: #374151;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chp-grade-row-mini {
    width: 70px;
    height: 4px;
    background: #f3f4f6;
    border-radius: 99px;
    overflow: hidden;
    flex-shrink: 0;
  }
  .chp-grade-row-mini-fill {
    height: 100%;
    border-radius: 99px;
    background: ${MAROON};
  }
  .chp-grade-row-count {
    font-size: 11px;
    font-weight: 700;
    color: #6b7280;
    flex-shrink: 0;
    width: 40px;
    text-align: right;
  }

  /* ── Deadline ── */
  .chp-deadline-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid #f9fafb;
  }
  .chp-deadline-row:last-child { border-bottom: none; }
  .chp-deadline-icon {
    width: 34px;
    height: 34px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .chp-deadline-info { flex: 1; min-width: 0; }
  .chp-deadline-title {
    font-size: 12px;
    font-weight: 700;
    color: #111827;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .chp-deadline-sub {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 3px;
    flex-wrap: wrap;
  }
  .chp-deadline-due {
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 4px;
    white-space: nowrap;
  }
  .chp-deadline-progress {
    font-size: 10px;
    color: #9ca3af;
    white-space: nowrap;
  }
  .chp-deadline-right {
    text-align: right;
    flex-shrink: 0;
  }
  .chp-deadline-frac {
    font-size: 13px;
    font-weight: 900;
    color: ${MAROON};
  }
  .chp-deadline-frac span {
    font-size: 10px;
    font-weight: 500;
    color: #9ca3af;
  }
  .chp-deadline-bar {
    width: 44px;
    height: 3px;
    background: #f0e4e4;
    border-radius: 99px;
    margin-top: 4px;
    overflow: hidden;
  }
  .chp-deadline-bar-fill {
    height: 100%;
    border-radius: 99px;
    background: ${MAROON};
  }

  /* ── Activity ── */
  .chp-activity-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid #f9fafb;
  }
  .chp-activity-row:last-child { border-bottom: none; }

  /* ── Enrollment ── */
  .chp-enroll-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid #f9fafb;
  }
  .chp-enroll-row:last-child { border-bottom: none; }

  /* ── Announcement ── */
  .chp-ann-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 9px 8px;
    border-bottom: 1px solid #f9fafb;
    border-radius: 8px;
    margin: 0 -8px;
    cursor: pointer;
    transition: background .1s;
    -webkit-tap-highlight-color: transparent;
  }
  .chp-ann-row:last-child { border-bottom: none; }
  .chp-ann-row:hover { background: #fdf8f8; }
  .chp-ann-row:active { background: #fdf2f2; }

  /* ── Spinner ── */
  .chp-spinner {
    width: 14px; height: 14px;
    border: 2px solid #f0e4e4;
    border-top: 2px solid ${MAROON};
    border-radius: 50%;
    animation: chp-spin .8s linear infinite;
  }
  @keyframes chp-spin { to { transform: rotate(360deg); } }

  /* ── Empty ── */
  .chp-empty {
    font-size: 12px;
    color: #9ca3af;
    text-align: center;
    padding: 16px 0;
    margin: 0;
  }

  /* ════════════════════════════════════════
     RESPONSIVE BREAKPOINTS
  ════════════════════════════════════════ */

  /* Tablet: single column, side cards in 2-col grid */
  @media (max-width: 1024px) {
    .chp-body {
      grid-template-columns: 1fr;
      padding: 16px 16px 28px;
    }
    .chp-side {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
  }

  /* Mobile large (≤768px): adjustments */
  @media (max-width: 768px) {
    .chp-header {
      min-height: 88px;
      padding: 0 16px;
    }
    .chp-header-content { padding: 16px 0 0; }
    .chp-stats {
      grid-template-columns: repeat(2, 1fr);
    }
    .chp-stat:nth-child(2) { border-right: none; }
    .chp-stat:nth-child(1),
    .chp-stat:nth-child(2) { border-bottom: 1px solid #f0f0f0; }
    .chp-body {
      padding: 12px 12px 24px;
      gap: 12px;
    }
    .chp-side {
      grid-template-columns: 1fr;
    }
    .chp-actions-grid {
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 12px 14px 14px;
    }
    .chp-card-body { padding: 10px 14px 14px; }
    .chp-card-header { padding: 12px 14px 0; }
    .chp-grade-row-mini { width: 56px; }
  }

  /* Mobile small (≤480px) */
  @media (max-width: 480px) {
    .chp-header { min-height: 80px; }
    .chp-header-tab { font-size: 10px; padding: 6px 10px 7px; }
    .chp-stats { grid-template-columns: repeat(2, 1fr); }
    .chp-stat { padding: 12px 12px; gap: 8px; }
    .chp-stat-icon { width: 30px; height: 30px; }
    .chp-actions-grid { gap: 6px; padding: 10px 12px 12px; }
    .chp-action-btn { padding: 9px 10px; gap: 8px; min-height: 48px; }
    .chp-action-label { font-size: 11px; }
    .chp-action-icon { width: 28px; height: 28px; }
    .chp-grade-row-mini { display: none; }
    .chp-grade-row-count { width: auto; }
  }

  /* Very small (≤360px): stack quick actions */
  @media (max-width: 360px) {
    .chp-actions-grid { grid-template-columns: 1fr; }
  }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function CourseHomePage({ courseId, courseName: initialCourseName }: Props) {
  const router = useRouter();

  const [courseName,       setCourseName]       = useState(initialCourseName);
  const [stats,            setStats]            = useState<Stats>({ people: 0, announcements: 0, assignments: 0, forms: 0 });
  const [activity,         setActivity]         = useState<ActivityItem[]>([]);
  const [loadingActivity,  setLoadingActivity]  = useState(true);
  const [deadlines,        setDeadlines]        = useState<Deadline[]>([]);
  const [loadingDeadlines, setLoadingDeadlines] = useState(true);
  const [gradingProgress,  setGradingProgress]  = useState<GradingProgress | null>(null);
  const [loadingGrading,   setLoadingGrading]   = useState(true);
  const [enrollments,      setEnrollments]      = useState<RecentEnrollment[]>([]);
  const [announcements,    setAnnouncements]    = useState<AnnouncementPreview[]>([]);

  /* ── Fetch grading progress ── */
  const fetchGradingProgress = useCallback(async () => {
    setLoadingGrading(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/grades`);
      if (!res.ok) throw new Error();
      const data = await res.json();

      const staff: {
        assignmentGrades: { assignmentId: string; grade: number | null; hasSubmission: boolean; status: string }[];
      }[] = data.staff ?? [];

      const assignments: { id: string; title: string }[] = data.assignments ?? [];

      let totalSubmissions = 0;
      let graded = 0;

      const byAssignment = assignments.map((a) => {
        let submitted = 0;
        let gradedCount = 0;
        staff.forEach((s) => {
          const g = s.assignmentGrades.find((g) => g.assignmentId === a.id);
          if (g?.hasSubmission) { submitted++; totalSubmissions++; }
          if (g?.status === "GRADED" && g.grade !== null) { gradedCount++; graded++; }
        });
        return { id: a.id, title: a.title, submitted, graded: gradedCount, total: staff.length };
      });

      const ungraded = totalSubmissions - graded;
      const gradedPct = totalSubmissions > 0 ? Math.round((graded / totalSubmissions) * 100) : 0;

      setGradingProgress({ totalSubmissions, graded, ungraded, gradedPct, byAssignment });
    } catch {
      setGradingProgress(null);
    } finally {
      setLoadingGrading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;

    fetch(`/api/admin/courses/${courseId}`)
      .then(r => r.json())
      .then(d => { if (d.course?.name) setCourseName(d.course.name); })
      .catch(() => {});

    fetch(`/api/admin/courses/${courseId}/activity`)
      .then(r => r.json())
      .then(d => {
        setActivity(d.activity ?? []);
        setStats(d.stats ?? { people: 0, announcements: 0, assignments: 0, forms: 0 });
      })
      .catch(() => {})
      .finally(() => setLoadingActivity(false));

    fetch(`/api/admin/courses/${courseId}/deadlines`)
      .then(r => r.json())
      .then(d => setDeadlines(d.deadlines ?? []))
      .catch(() => setDeadlines([]))
      .finally(() => setLoadingDeadlines(false));

    fetch(`/api/admin/courses/${courseId}/enrollments/recent`)
      .then(r => r.json())
      .then(d => setEnrollments(d.enrollments ?? []))
      .catch(() => setEnrollments([]));

    fetch(`/api/admin/courses/${courseId}/announcements?limit=3`)
      .then(r => r.json())
      .then(d => setAnnouncements(d.announcements ?? []))
      .catch(() => setAnnouncements([]));

    fetchGradingProgress();
  }, [courseId, fetchGradingProgress]);

  /* ── Activity icon ── */
  function activityIcon(type: ActivityItem["type"]) {
    const cfg = {
      submission:   { bg: "#eff6ff", stroke: "#3b82f6", path: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round"/><polyline points="17 8 12 3 7 8" strokeLinecap="round"/><line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round"/></> },
      announcement: { bg: "#fdf2f2", stroke: MAROON,    path: <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round"/> },
      enrollment:   { bg: "#f0fdf4", stroke: "#16a34a", path: <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14" strokeLinecap="round"/><line x1="23" y1="11" x2="17" y2="11" strokeLinecap="round"/></> },
      grade:        { bg: "#fefce8", stroke: "#ca8a04", path: <><path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round"/></> },
      general:      { bg: "#f9fafb", stroke: "#9ca3af", path: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round"/></> },
    };
    const c = cfg[type];
    return (
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="13" height="13" fill="none" stroke={c.stroke} strokeWidth={2} viewBox="0 0 24 24">{c.path}</svg>
      </div>
    );
  }

  const quickActions = [
    {
      label: "New Announcement",
      icon: <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round" strokeLinejoin="round"/>,
      onClick: () => router.push(`/admin/courses/${courseId}/announcements`),
    },
    {
      label: "New Assignment",
      icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9" strokeLinecap="round"/><line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round"/></>,
      onClick: () => router.push(`/admin/courses/${courseId}/assignments`),
    },
    {
      label: "View Grades",
      icon: <><path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/></>,
      onClick: () => router.push(`/admin/courses/${courseId}/grades`),
    },
    {
      label: "View People",
      icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round"/></>,
      onClick: () => router.push(`/admin/courses/${courseId}/people`),
    },
  ];

  const statItems = [
    { label: "Staff",         value: stats.people,        color: "#2563eb", bg: "#eff6ff", icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round"/></> },
    { label: "Assignments",   value: stats.assignments,   color: MAROON,    bg: "#fdf2f2", icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9" strokeLinecap="round"/><line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round"/></> },
    { label: "Forms",         value: stats.forms,         color: "#0891b2", bg: "#ecfeff", icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10h8M8 14h5" strokeLinecap="round"/><circle cx="17" cy="14" r="2.5"/></> },
    { label: "Announcements", value: stats.announcements, color: "#7c3aed", bg: "#f5f3ff", icon: <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round"/> },
  ];

  const gradePctColor = (p: number) => p >= 80 ? "#15803d" : p >= 50 ? "#b45309" : MAROON;

  return (
    <>
      <style>{buildCss()}</style>
      <div className="chp-root">

        {/* ── Header ── */}
        <div className="chp-header">
          <div className="chp-header-content">
            <p className="chp-header-eyebrow">Office Overview</p>
            <h1 className="chp-header-title">{courseName}</h1>
            <div className="chp-header-tabs">
              <button className="chp-header-tab active">Home</button>
              <button
                className="chp-header-tab"
                onClick={() => router.push(`/admin/courses/${courseId}/assignments`)}
              >
                Assignments
              </button>
              <button
                className="chp-header-tab"
                onClick={() => router.push(`/admin/courses/${courseId}/grades`)}
              >
                Grades
              </button>
              <button
                className="chp-header-tab"
                onClick={() => router.push(`/admin/courses/${courseId}/people`)}
              >
                People
              </button>
            </div>
          </div>
        </div>

        {/* ── Stat strip ── */}
        <div className="chp-stats">
          {statItems.map(s => (
            <div key={s.label} className="chp-stat">
              <div className="chp-stat-icon" style={{ background: s.bg }}>
                <svg width="16" height="16" fill="none" stroke={s.color} strokeWidth={2} viewBox="0 0 24 24">
                  {s.icon}
                </svg>
              </div>
              <div className="chp-stat-info">
                <div className="chp-stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="chp-stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="chp-body">

          {/* ── Main column ── */}
          <div className="chp-main">

            {/* Quick Actions */}
            <div className="chp-card">
              <div className="chp-card-header" style={{ paddingBottom: 0 }}>
                <p className="chp-card-title">Quick Actions</p>
              </div>
              <div className="chp-actions-grid">
                {quickActions.map(a => (
                  <button key={a.label} type="button" className="chp-action-btn" onClick={a.onClick}>
                    <div className="chp-action-icon">
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        {a.icon}
                      </svg>
                    </div>
                    <span className="chp-action-label">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Grading Progress */}
            <div className="chp-card">
              <div className="chp-card-header">
                <p className="chp-card-title">Grading Progress</p>
                <button className="chp-card-action" onClick={() => router.push(`/admin/courses/${courseId}/grades`)}>
                  Open Gradebook →
                </button>
              </div>
              <div className="chp-card-body">
                {loadingGrading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="chp-spinner"/>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>Loading…</span>
                  </div>
                ) : !gradingProgress || gradingProgress.totalSubmissions === 0 ? (
                  <p className="chp-empty">No submissions yet.</p>
                ) : (
                  <>
                    <div className="chp-grade-summary">
                      <div className="chp-grade-stat">
                        <div className="chp-grade-stat-val" style={{ color: "#374151" }}>{gradingProgress.totalSubmissions}</div>
                        <div className="chp-grade-stat-label">Submitted</div>
                      </div>
                      <div className="chp-grade-stat">
                        <div className="chp-grade-stat-val" style={{ color: "#15803d" }}>{gradingProgress.graded}</div>
                        <div className="chp-grade-stat-label">Graded</div>
                      </div>
                      <div className="chp-grade-stat">
                        <div className="chp-grade-stat-val" style={{ color: gradingProgress.ungraded > 0 ? MAROON : "#9ca3af" }}>{gradingProgress.ungraded}</div>
                        <div className="chp-grade-stat-label">Pending</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af" }}>Overall grading progress</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: gradePctColor(gradingProgress.gradedPct) }}>
                        {gradingProgress.gradedPct}%
                      </span>
                    </div>
                    <div className="chp-grade-bar-wrap">
                      <div className="chp-grade-bar-fill" style={{ width: `${gradingProgress.gradedPct}%` }}/>
                    </div>

                    {gradingProgress.byAssignment.filter(a => a.submitted > 0).length > 0 && (
                      <div style={{ marginTop: 4 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 8px" }}>
                          By Assignment
                        </p>
                        {gradingProgress.byAssignment
                          .filter(a => a.submitted > 0)
                          .slice(0, 5)
                          .map(a => (
                            <div key={a.id} className="chp-grade-row">
                              <div className="chp-grade-row-title" title={a.title}>{a.title}</div>
                              <div className="chp-grade-row-mini">
                                <div className="chp-grade-row-mini-fill" style={{ width: `${pct(a.graded, a.submitted)}%` }}/>
                              </div>
                              <div className="chp-grade-row-count">{a.graded}/{a.submitted}</div>
                            </div>
                          ))}
                      </div>
                    )}

                    {gradingProgress.ungraded > 0 && (
                      <div style={{ marginTop: 12, padding: "8px 12px", background: "#fef2f2", borderRadius: 8, border: "1px solid #f0c0c0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: MAROON }}>
                          {gradingProgress.ungraded} submission{gradingProgress.ungraded !== 1 ? "s" : ""} need grading
                        </span>
                        <button
                          onClick={() => router.push(`/admin/courses/${courseId}/grades`)}
                          style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: MAROON, border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontFamily: FONT, flexShrink: 0 }}
                        >
                          Grade Now
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="chp-card">
              <div className="chp-card-header">
                <p className="chp-card-title">Recent Activity</p>
              </div>
              <div className="chp-card-body">
                {loadingActivity ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="chp-spinner"/>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>Loading…</span>
                  </div>
                ) : activity.length === 0 ? (
                  <p className="chp-empty">No recent activity.</p>
                ) : activity.map(item => (
                  <div key={item.id} className="chp-activity-row">
                    {activityIcon(item.type)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: "#374151", margin: 0, lineHeight: 1.5 }}>
                        {item.user && <span style={{ fontWeight: 700, color: "#111827" }}>{item.user} </span>}
                        {item.text}
                      </p>
                      <p style={{ fontSize: 10.5, color: "#9ca3af", margin: "2px 0 0" }}>{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Sidebar column ── */}
          <div className="chp-side">

            {/* Upcoming Deadlines */}
            <div className="chp-card">
              <div className="chp-card-header">
                <p className="chp-card-title">Upcoming Deadlines</p>
                <button className="chp-card-action" onClick={() => router.push(`/admin/courses/${courseId}/assignments`)}>
                  View all
                </button>
              </div>
              <div className="chp-card-body">
                {loadingDeadlines ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="chp-spinner"/>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>Loading…</span>
                  </div>
                ) : deadlines.length === 0 ? (
                  <p className="chp-empty">No upcoming deadlines.</p>
                ) : deadlines.map(d => {
                  const isForm = d.type === "form";
                  const submittedPct = pct(d.submissions, d.total);
                  const dueLow = d.dueDate === "Due today" || d.dueDate === "Tomorrow" || d.dueDate === "Overdue";
                  return (
                    <div key={d.id} className="chp-deadline-row">
                      <div className="chp-deadline-icon" style={{ background: isForm ? "#ecfeff" : "#fdf2f2" }}>
                        {isForm ? (
                          <svg width="14" height="14" fill="none" stroke="#0891b2" strokeWidth={2} viewBox="0 0 24 24">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <path d="M8 10h8M8 14h5" strokeLinecap="round"/>
                            <circle cx="17" cy="14" r="2"/>
                          </svg>
                        ) : (
                          <svg width="14" height="14" fill="none" stroke={MAROON} strokeWidth={2} viewBox="0 0 24 24">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <line x1="9" y1="9" x2="15" y2="9" strokeLinecap="round"/>
                            <line x1="9" y1="13" x2="15" y2="13" strokeLinecap="round"/>
                          </svg>
                        )}
                      </div>
                      <div className="chp-deadline-info">
                        <p className="chp-deadline-title">{d.title}</p>
                        <div className="chp-deadline-sub">
                          <span className="chp-deadline-due" style={{ background: dueLow ? "#fef2f2" : "#f3f4f6", color: dueLow ? MAROON : "#6b7280" }}>
                            {d.dueDate}
                          </span>
                          <span className="chp-deadline-progress">{submittedPct}% submitted</span>
                        </div>
                      </div>
                      <div className="chp-deadline-right">
                        <div className="chp-deadline-frac">{d.submissions}<span>/{d.total}</span></div>
                        <div className="chp-deadline-bar">
                          <div className="chp-deadline-bar-fill" style={{ width: `${submittedPct}%` }}/>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Enrollments */}
            <div className="chp-card">
              <div className="chp-card-header">
                <p className="chp-card-title">Recent Enrollments</p>
                <button className="chp-card-action" onClick={() => router.push(`/admin/courses/${courseId}/people`)}>
                  View all
                </button>
              </div>
              <div className="chp-card-body">
                {enrollments.length === 0 ? (
                  <p className="chp-empty">No recent enrollments.</p>
                ) : enrollments.map(e => (
                  <div key={e.id} className="chp-enroll-row">
                    <Avatar name={e.name} image={e.image} size={32}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.name}
                      </p>
                      <p style={{ fontSize: 10.5, color: "#9ca3af", margin: "1px 0 0" }}>
                        {e.role} · {e.joinedAt}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Announcements */}
            <div className="chp-card">
              <div className="chp-card-header">
                <p className="chp-card-title">Announcements</p>
                <button className="chp-card-action" onClick={() => router.push(`/admin/courses/${courseId}/announcements`)}>
                  View all
                </button>
              </div>
              <div className="chp-card-body">
                {announcements.length === 0 ? (
                  <p className="chp-empty">No announcements yet.</p>
                ) : announcements.map(a => (
                  <div
                    key={a.id}
                    className="chp-ann-row"
                    onClick={() => router.push(`/admin/courses/${courseId}/announcements/${a.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === "Enter" && router.push(`/admin/courses/${courseId}/announcements/${a.id}`)}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#fdf2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="12" height="12" fill="none" stroke={MAROON} strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M22 5v14l-10-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h8L22 5z" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a.title}
                      </p>
                      <p style={{ fontSize: 10.5, color: "#9ca3af", margin: "2px 0 0" }}>
                        {a.author} · {a.postedAt}
                      </p>
                    </div>
                    <svg width="12" height="12" fill="none" stroke="#d1d5db" strokeWidth={2} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                      <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}