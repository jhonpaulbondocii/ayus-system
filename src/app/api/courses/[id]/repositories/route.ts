// src/app/api/courses/[id]/repositories/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const isAdmin = access.systemRole === "ADMIN";

    // Get enrollment to determine role
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: access.userId, courseId } },
      select: { courseRole: true },
    });

    const courseRole = enrollment?.courseRole ?? access.courseRole ?? "";
    const roles = courseRole.split(",").map((r: string) => r.trim().toLowerCase());
    const isHead = isAdmin || roles.includes("head");

    // Only heads and admins can view repositories
    if (!isHead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all repositories for this course, with full file + submission + user data
    const repositories = await prisma.repository.findMany({
      where: { courseId },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            dueDate: true,
            points: true,
            status: true,
            assignees: true,
            // Count submissions and enrollments for progress tracking
            submissions: {
              select: { id: true },
            },
          },
        },
        files: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
            submission: {
              select: {
                id: true,
                status: true,
                grade: true,
                feedback: true,
                submittedAt: true,
              },
            },
          },
          orderBy: { uploadedAt: "desc" },
        },
        _count: {
          select: {
            files: true,
            logs: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // For each assignment, get enrollment count (how many are assigned)
    // We batch this to avoid N+1
    const assignmentIds = repositories.map((r) => r.assignmentId);

    // Get total enrolled in course (for assignments assigned to "Everyone")
    const totalEnrolled = await prisma.courseEnrollment.count({
      where: { courseId },
    });

    // Build submission count per assignment
    const submissionCounts = await prisma.submission.groupBy({
      by: ["assignmentId"],
      where: { assignmentId: { in: assignmentIds } },
      _count: { id: true },
    });

    const submissionCountMap = new Map(
      submissionCounts.map((s) => [s.assignmentId, s._count.id])
    );

    // Shape the response to match what the frontend expects
    const shaped = repositories.map((repo) => {
      const assignment = repo.assignment;
      const assignees = assignment.assignees ?? [];

      // Determine enrolled count:
      // If assignees is empty (Everyone) use total enrolled,
      // otherwise use assignees length as an approximation.
      const enrollmentCount =
        assignees.length === 0 ? totalEnrolled : assignees.length;

      return {
        id: repo.id,
        name: repo.name,
        hasRepo: true,
        createdAt: repo.createdAt.toISOString(),
        assignmentId: repo.assignmentId,
        assignment: {
          id: assignment.id,
          title: assignment.title,
          dueDate: assignment.dueDate?.toISOString() ?? null,
          points: assignment.points,
          status: assignment.status,
          submissionCount: submissionCountMap.get(repo.assignmentId) ?? 0,
          enrollmentCount,
        },
        files: repo.files.map((f) => ({
          id: f.id,
          fileName: f.fileName,
          fileUrl: f.fileUrl,
          fileSize: f.fileSize,
          mimeType: f.mimeType,
          uploadedAt: f.uploadedAt.toISOString(),
          user: {
            id: f.user.id,
            name: f.user.name,
            email: f.user.email,
            image: f.user.image,
          },
          submission: f.submission
            ? {
                id: f.submission.id,
                status: f.submission.status,
                grade: f.submission.grade,
                feedback: f.submission.feedback,
                submittedAt: f.submission.submittedAt?.toISOString() ?? null,
              }
            : null,
        })),
        _count: {
          files: repo._count.files,
          logs: repo._count.logs,
        },
      };
    });

    return NextResponse.json({ repositories: shaped });
  } catch (error) {
    console.error("[GET /api/courses/[id]/repositories]", error);
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}