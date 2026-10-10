// src/app/api/admin/courses/[id]/activity/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHeadOrAdmin } from "@/lib/require-head-or-admin";

type ActivityItem = {
  id: string;
  type: "submission" | "announcement" | "enrollment" | "grade" | "general" | "form";
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
  const { id: courseId } = await params;

  const auth = await requireHeadOrAdmin(courseId);
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

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

  const [
    recentSubmissions,
    recentAnnouncements,
    recentEnrollments,
    recentFormSubmissions,
    recentAssignments,
    recentForms,
  ] =
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

      prisma.formSubmission.findMany({
        where: { form: { courseId } },
        select: {
          id: true,
          createdAt: true,
          user: { select: { name: true } },
          form: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      prisma.assignment.findMany({
        where: { courseId },
        select: { id: true, title: true, createdAt: true, createdById: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      prisma.form.findMany({
        where: { courseId },
        select: {
          id: true,
          title: true,
          createdAt: true,
          author: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    // Assignment has no author relation, so look up creator names
    const creatorIds = Array.from(
      new Set(
        recentAssignments
          .map((a) => a.createdById)
          .filter((id): id is string => !!id)
      )
    );
    const creators = creatorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, name: true },
        })
      : [];
    const creatorNameMap = new Map(creators.map((c) => [c.id, c.name]));

    const withTs: ActivityItemWithTs[] = [
    ...recentAssignments.map((a) => ({
      id: `asgn-${a.id}`,
      type: "submission" as const,
      text: `created assignment: "${a.title}"`,
      user: (a.createdById ? creatorNameMap.get(a.createdById) : undefined) ?? undefined,
      time: formatTime(a.createdAt),
      _ts: a.createdAt,
    })),

    ...recentForms.map((f) => ({
      id: `form-${f.id}`,
      type: "form" as const,
      text: `created form: "${f.title}"`,
      user: f.author?.name ?? undefined,
      time: formatTime(f.createdAt),
      _ts: f.createdAt,
    })),

    ...recentFormSubmissions.map((fs) => ({
      id: `fsub-${fs.id}`,
      type: "general" as const,
      text: `submitted form: "${fs.form.title}"`,
      user: fs.user.name ?? undefined,
      time: formatTime(fs.createdAt),
      _ts: fs.createdAt,
    })),

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
    .slice(0, 30)
    .map(({ _ts: _ts, ...rest }) => { void _ts; return rest; });

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