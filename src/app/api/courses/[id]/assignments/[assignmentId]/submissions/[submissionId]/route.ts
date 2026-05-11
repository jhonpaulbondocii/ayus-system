// src/app/api/courses/[id]/assignments/[assignmentId]/submissions/[submissionId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";
import { AssignmentStatus } from "@/generated/prisma";

export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      assignmentId: string;
      submissionId: string;
    }>;
  }
) {
  try {
    const { id: courseId, assignmentId, submissionId } = await params;

    const access = await requireCoursePermission(courseId, "manage_assignments");

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const isAdmin = access.systemRole === "ADMIN";
    const isHead = access.courseRole === "Head";

    if (!isAdmin && !isHead) {
      return NextResponse.json(
        { error: "You do not have permission to grade submissions." },
        { status: 403 }
      );
    }

    const existing = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        assignmentId,
        assignment: { courseId },
      },
      select: { id: true, status: true, userId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Submission not found." },
        { status: 404 }
      );
    }

    const body = (await req.json()) as {
      grade?: number | null;
      feedback?: string | null;
      status?: string;
    };

    const { grade, feedback, status } = body;

    // Only valid enum values: PENDING, SUBMITTED, GRADED, OVERDUE
    function toAssignmentStatus(s: string): AssignmentStatus {
      const upper = s.toUpperCase();
      if (upper === "GRADED")   return AssignmentStatus.GRADED;
      if (upper === "OVERDUE")  return AssignmentStatus.OVERDUE;
      if (upper === "PENDING")  return AssignmentStatus.PENDING;
      return AssignmentStatus.SUBMITTED;
    }

    let resolvedStatus: AssignmentStatus = existing.status;
    if (status) {
      resolvedStatus = toAssignmentStatus(status);
    } else if (grade != null) {
      resolvedStatus = AssignmentStatus.GRADED;
    }

    const updated = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        ...(grade !== undefined && {
          grade: grade === null ? null : Number(grade),
        }),
        ...(feedback !== undefined && {
          feedback: feedback?.trim() || null,
        }),
        status: resolvedStatus,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: updated.userId },
      select: { name: true, email: true },
    });

    return NextResponse.json({
      submission: {
        id: updated.id,
        userId: updated.userId,
        userName: user?.name ?? null,
        userEmail: user?.email ?? "",
        status: updated.status,
        grade: updated.grade,
        feedback: updated.feedback,
        submittedAt: updated.submittedAt?.toISOString() ?? null,
        fileUrl: updated.fileUrl,
        textEntry: updated.textEntry,
        websiteUrl: updated.websiteUrl,
      },
    });
  } catch (err) {
    console.error("[PATCH submission grade]", err);
    return NextResponse.json(
      { error: "Failed to update submission." },
      { status: 500 }
    );
  }
}