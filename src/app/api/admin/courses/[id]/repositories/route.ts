// src/app/api/admin/courses/[id]/repositories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId } = await params;

  const [assignments, enrollmentCount] = await Promise.all([
    // Fetch ALL assignments for this course, including their repository if it exists
    prisma.assignment.findMany({
      where: { courseId },
      include: {
        repository: {
          include: {
            files: {
              include: {
                user: { select: { id: true, name: true, email: true, image: true } },
              },
              orderBy: { uploadedAt: "desc" },
            },
            _count: { select: { files: true, logs: true } },
          },
        },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.courseEnrollment.count({ where: { courseId } }),
  ]);

  // Build a unified repository list from assignments
  // Each assignment either has a repo already or we represent it without one
  const repositories = assignments.map((a) => {
    const repo = a.repository;
    return {
      id: repo?.id ?? `assignment-${a.id}`,   // use assignment id as fallback key
      name: repo?.name ?? a.title,
      assignmentId: a.id,
      courseId,
      createdAt: repo?.createdAt ?? a.createdAt,
      hasRepo: !!repo,
      assignment: {
        id: a.id,
        title: a.title,
        dueDate: a.dueDate,
        points: a.points,
        status: a.status,
        submissionCount: a._count.submissions,
        enrollmentCount,
      },
      files: repo?.files ?? [],
      _count: {
        files: repo?._count.files ?? 0,
        logs: repo?._count.logs ?? 0,
      },
    };
  });

  return NextResponse.json({ repositories });
}