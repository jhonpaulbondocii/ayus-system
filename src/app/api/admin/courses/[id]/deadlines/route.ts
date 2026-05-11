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

  // Only count Staff (not Admin/Head) as the "total" target
  const totalStaff = await prisma.courseEnrollment.count({
    where: {
      courseId,
      courseRole: { notIn: ["Admin", "Head"] },
    },
  });

  const staffEnrollments = await prisma.courseEnrollment.findMany({
    where: { courseId, courseRole: { notIn: ["Admin", "Head"] } },
    select: { userId: true },
  });
  const staffIds = staffEnrollments.map((e) => e.userId);

  const [assignments, forms] = await Promise.all([
    // Published assignments with upcoming due dates
    prisma.assignment.findMany({
      where: {
        courseId,
        status: "PUBLISHED",
        dueDate: { gte: now },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        _count: {
          select: {
            submissions: {
              where: {
                submittedAt: { not: null },
                userId: { in: staffIds },
              },
            },
          },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),

    // Published forms with upcoming due dates
    prisma.form.findMany({
      where: {
        courseId,
        published: true,
        dueDate: { gte: now },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        _count: {
          select: {
            formSubmissions: {
              where: { userId: { in: staffIds } },
            },
          },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
  ]);

  type DeadlineItemRaw = {
    id: string;
    title: string;
    type: "assignment" | "form";
    dueDate: string;
    submissions: number;
    total: number;
    sortDate: Date;
  };

  type DeadlineItem = Omit<DeadlineItemRaw, "sortDate">;

  const raw: DeadlineItemRaw[] = [
    ...assignments.map((a) => ({
      id: a.id,
      title: a.title,
      type: "assignment" as const,
      dueDate: formatDueDate(a.dueDate!),
      submissions: a._count.submissions,
      total: totalStaff,
      sortDate: a.dueDate!,
    })),
    ...forms.map((f) => ({
      id: f.id,
      title: f.title,
      type: "form" as const,
      dueDate: formatDueDate(f.dueDate!),
      submissions: f._count.formSubmissions,
      total: totalStaff,
      sortDate: f.dueDate!,
    })),
  ].sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

  const deadlines: DeadlineItem[] = raw
    .slice(0, 6)
    .map(({ sortDate: _, ...rest }) => rest);

  return NextResponse.json({ deadlines });
}