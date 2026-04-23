// src/app/api/admin/courses/[id]/repositories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Fetch repos + enrollment count in parallel
  const [repositories, courseWithEnrollments] = await Promise.all([
    prisma.repository.findMany({
      where: { courseId: id },
      include: {
        assignment: {
          select: { id: true, title: true, dueDate: true, points: true, status: true },
        },
        files: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
          orderBy: { uploadedAt: "desc" },
        },
        _count: { select: { files: true, logs: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Use _count on course to get enrollment count (works with any Prisma schema)
    prisma.course.findUnique({
      where: { id },
      select: { _count: { select: { enrollments: true } } },
    }),
  ]);

  const enrollmentCount = courseWithEnrollments?._count?.enrollments ?? 0;

  // Attach enrollmentCount to each repository's assignment
  const enriched = repositories.map((repo: typeof repositories[number]) => ({
    ...repo,
    assignment: {
      ...repo.assignment,
      enrollmentCount,
    },
  }));

  return NextResponse.json({ repositories: enriched });
}