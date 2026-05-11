// src/app/api/admin/courses/[id]/grades/[studentId]/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendGradeEmail } from "@/lib/email";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: courseId, studentId } = await params;
    const body = await req.json();
    const { assignmentId, grade, feedback } = body as {
      assignmentId: string;
      grade: number | null;
      feedback?: string;
    };

    if (!assignmentId) {
      return NextResponse.json(
        { error: "assignmentId is required" },
        { status: 400 }
      );
    }

    // Verify assignment belongs to this course
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, courseId },
      select: { id: true, title: true, points: true },
    });
    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found in this course" },
        { status: 404 }
      );
    }

    // Verify the staff/head member is enrolled in this course
    const enrollment = await prisma.courseEnrollment.findFirst({
      where: { userId: studentId, courseId },
    });
    if (!enrollment) {
      return NextResponse.json(
        { error: "User not enrolled in this course" },
        { status: 404 }
      );
    }

    // Determine new status
    const newStatus =
      grade !== null ? ("GRADED" as const) : ("PENDING" as const);

    // Upsert submission
    const submission = await prisma.submission.upsert({
      where: {
        userId_assignmentId: {
          userId: studentId,
          assignmentId,
        },
      },
      update: {
        grade,
        feedback: feedback ?? undefined,
        status: newStatus,
        updatedAt: new Date(),
      },
      create: {
        userId: studentId,
        assignmentId,
        grade,
        feedback: feedback ?? null,
        status: newStatus,
      },
    });

    // ── Send grade notification email if a real grade was assigned ────────
    if (grade !== null) {
      try {
        // Fetch the enrolled user + course name in parallel
        const [enrolledUser, course] = await Promise.all([
          prisma.user.findUnique({
            where: { id: studentId },
            select: { name: true, email: true },
          }),
          prisma.course.findUnique({
            where: { id: courseId },
            select: { name: true },
          }),
        ]);

        if (enrolledUser?.email && course?.name) {
          await sendGradeEmail({
            to: enrolledUser.email,
            name: enrolledUser.name ?? "Staff",
            courseName: course.name,
            assignmentTitle: assignment.title,
            score: grade,
            maxPoints: assignment.points,
            // Pass feedback so it appears in the email when present
            feedback: feedback ?? null,
          });
        }
      } catch (emailErr) {
        // Email failure must NOT roll back the grade save — log and continue
        console.error("[grade-email] Failed to send grade notification:", emailErr);
      }
    }

    return NextResponse.json({ submission });
  } catch (error) {
    console.error(
      "PATCH /api/admin/courses/[id]/grades/[studentId] error:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}