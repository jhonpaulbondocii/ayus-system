// src/app/api/assignments/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const enrollments = await prisma.courseEnrollment.findMany({
      where: { userId },
      select: { courseId: true },
    });
    const courseIds = enrollments.map((e: { courseId: string }) => e.courseId);

    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m: { groupId: string }) => m.groupId);

    const assignments = await prisma.assignment.findMany({
      where: {
        OR: [
          { courseId: { in: courseIds } },
          { groupId: { in: groupIds } },
        ],
      },
      include: {
        course: { select: { id: true, name: true, code: true, color: true } },
        group:  { select: { id: true, name: true } },
        submissions: {
          where: { userId },
          select: { status: true, grade: true, submittedAt: true },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    const result = assignments.map((a) => ({
      id:          a.id,
      title:       a.title,
      description: a.description,
      dueDate:     a.dueDate ? a.dueDate.toISOString() : null,
      course:      a.course,
      group:       a.group,
      status:      a.submissions[0]?.status ?? "PENDING",
      grade:       a.submissions[0]?.grade  ?? null,
      submittedAt: a.submissions[0]?.submittedAt ?? null,
    }));

    return NextResponse.json({ assignments: result });
  } catch (error) {
    console.error("GET /api/assignments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}