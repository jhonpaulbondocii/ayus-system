// src/app/api/admin/courses/[id]/activity/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SessionUser = { role?: string };

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  if ((session.user as SessionUser)?.role !== "ADMIN") return null;
  return session;
}

type ActivityItem = {
  id: string;
  type: "submission" | "announcement" | "enrollment" | "grade" | "general";
  text: string;
  user?: string;
  time: string;
};

type ActivityItemWithTs = ActivityItem & { _ts: Date };

const formatTime = (date: Date): string => {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId } = await params;

  const [
    peopleCount,
    announcementCount,
    assignmentCount,
    quizCount,
    formCount,
  ] = await Promise.all([
    prisma.courseEnrollment.count({ where: { courseId } }),
    prisma.announcement.count({ where: { courseId } }),
    prisma.assignment.count({ where: { courseId } }),
    prisma.quiz.count({ where: { courseId } }),
    prisma.form.count({ where: { courseId } }),
  ]);

  const [recentSubmissions, recentAnnouncements, recentEnrollments] =
    await Promise.all([
      prisma.submission.findMany({
        where: { assignment: { courseId }, submittedAt: { not: null } },
        select: {
          id: true,
          submittedAt: true,
          user: { select: { name: true } },
          assignment: { select: { title: true } },
        },
        orderBy: { submittedAt: "desc" },
        take: 5,
      }),

      prisma.announcement.findMany({
        where: { courseId },
        select: { id: true, title: true, author: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      prisma.courseEnrollment.findMany({
        where: { courseId },
        select: {
          id: true,
          createdAt: true,
          courseRole: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const withTs: ActivityItemWithTs[] = [
    ...recentSubmissions.map((s) => ({
      id: `sub-${s.id}`,
      type: "submission" as const,
      text: `submitted "${s.assignment.title}"`,
      user: s.user.name ?? undefined,
      time: formatTime(s.submittedAt!),
      _ts: s.submittedAt!,
    })),

    ...recentAnnouncements.map((a) => ({
      id: `ann-${a.id}`,
      type: "announcement" as const,
      text: `New announcement: "${a.title}"`,
      user: a.author ?? undefined,
      time: formatTime(a.createdAt),
      _ts: a.createdAt,
    })),

    ...recentEnrollments.map((e) => ({
      id: `enr-${e.id}`,
      type: "enrollment" as const,
      text: `joined the course as ${e.courseRole}`,
      user: e.user.name ?? undefined,
      time: formatTime(e.createdAt),
      _ts: e.createdAt,
    })),
  ];

  const activity: ActivityItem[] = withTs
    .sort((a, b) => b._ts.getTime() - a._ts.getTime())
    .slice(0, 10)
    .map(({ _ts: _ignored, ...rest }) => rest);

  return NextResponse.json({
    stats: {
      people: peopleCount,
      announcements: announcementCount,
      assignments: assignmentCount,
      quizzes: quizCount,
      forms: formCount,
    },
    activity,
  });
}