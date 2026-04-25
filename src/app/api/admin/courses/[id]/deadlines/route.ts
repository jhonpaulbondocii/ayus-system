// src/app/api/admin/courses/[id]/deadlines/route.ts

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

const formatDueDate = (date: Date): string => {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return "Overdue";
  if (days === 0) return "Due today";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return `In ${days} days`;
  if (days <= 14) return `In ${Math.ceil(days / 7)} week`;
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId } = await params;

  const now = new Date();

  // Total enrolled people for "total" count
  const totalEnrolled = await prisma.courseEnrollment.count({
    where: { courseId },
  });

  const [assignments, quizzes] = await Promise.all([
    // Upcoming assignments with due dates
    prisma.assignment.findMany({
      where: {
        courseId,
        dueDate: { gte: now },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        _count: {
          select: {
            submissions: {
              where: { submittedAt: { not: null } },
            },
          },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),

    // Upcoming quizzes with due dates
    prisma.quiz.findMany({
      where: {
        courseId,
        dueDate: { gte: now },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        _count: {
          select: { attempts: true },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
  ]);

  // Merge and sort by due date, take top 5
  type DeadlineItem = {
    id: string;
    title: string;
    type: "assignment" | "quiz";
    dueDate: string;
    submissions: number;
    total: number;
  };

  const deadlines: DeadlineItem[] = [
    ...assignments.map((a) => ({
      id: a.id,
      title: a.title,
      type: "assignment" as const,
      dueDate: formatDueDate(a.dueDate!),
      submissions: a._count.submissions,
      total: totalEnrolled,
      _sortDate: a.dueDate!,
    })),
    ...quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      type: "quiz" as const,
      dueDate: formatDueDate(q.dueDate!),
      submissions: q._count.attempts,
      total: totalEnrolled,
      _sortDate: q.dueDate!,
    })),
  ]
    .sort((a, b) => a._sortDate.getTime() - b._sortDate.getTime())
    .slice(0, 5)
    .map(({ _sortDate: _ignored, ...rest }) => rest);

  return NextResponse.json({ deadlines });
}