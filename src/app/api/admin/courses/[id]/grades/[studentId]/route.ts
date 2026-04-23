// src/app/api/admin/courses/[id]/grades/[studentId]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      return NextResponse.json({ error: "assignmentId required" }, { status: 400 });
    }

    // Verify the assignment belongs to this course
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, courseId },
    });
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Upsert the submission with the new grade
    const submission = await prisma.submission.upsert({
      where: { userId_assignmentId: { userId: studentId, assignmentId } },
      update: {
        grade,
        feedback: feedback ?? undefined,
        status: grade !== null ? "GRADED" : "PENDING",
      },
      create: {
        userId: studentId,
        assignmentId,
        grade,
        feedback: feedback ?? null,
        status: grade !== null ? "GRADED" : "PENDING",
      },
    });

    return NextResponse.json({ submission });
  } catch (error) {
    console.error("PATCH /api/admin/courses/[id]/grades/[studentId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}