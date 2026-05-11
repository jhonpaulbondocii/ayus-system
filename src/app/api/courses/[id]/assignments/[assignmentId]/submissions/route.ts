// src/app/api/courses/[id]/assignments/[assignmentId]/submissions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const { id: courseId, assignmentId } = await params;

    const access = await requireCoursePermission(courseId, "view_course");

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const userId = access.userId;
    const isAdmin = access.systemRole === "ADMIN";
    const isHead = access.courseRole === "Head";
    const canViewAll = isAdmin || isHead;

    // Verify assignment belongs to this course
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, courseId },
      select: { id: true },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found." },
        { status: 404 }
      );
    }

    // ✅ HEAD/ADMIN see ALL submissions; staff only see their own
    const submissions = await prisma.submission.findMany({
      where: {
        assignmentId,
        ...(canViewAll ? {} : { userId }),
      },
      select: {
        id: true,
        userId: true,
        status: true,
        grade: true,
        submittedAt: true,
        fileUrl: true,
        textEntry: true,
        websiteUrl: true,
        comments: true,
        feedback: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    const shaped = submissions.map((sub) => ({
      id: sub.id,
      userId: sub.userId,
      userName: sub.user?.name ?? null,
      userEmail: sub.user?.email ?? "",
      userImage: sub.user?.image ?? null,
      status: sub.status,
      grade: sub.grade,
      submittedAt: sub.submittedAt?.toISOString() ?? null,
      fileUrl: sub.fileUrl,
      fileName: sub.fileUrl
        ? sub.fileUrl.split("/").pop()?.split("?")[0] ?? null
        : null,
      textEntry: sub.textEntry,
      websiteUrl: sub.websiteUrl,
      comments: sub.comments,
      feedback: sub.feedback,
      isCurrentUser: sub.userId === userId,
    }));

    return NextResponse.json({ submissions: shaped });
  } catch (err) {
    console.error("[GET submissions]", err);
    return NextResponse.json(
      { error: "Failed to fetch submissions." },
      { status: 500 }
    );
  }
}