// src/app/api/courses/[id]/grades/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: courseId } = await params;
    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isAdmin = user?.role === "ADMIN";

    if (!isAdmin) {
      const enrollment = await prisma.courseEnrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      });
      if (!enrollment) {
        return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
      }
    }

    // Fetch assignments assigned to this user but NOT created by them
    const assignments = await prisma.assignment.findMany({
  where: {
    courseId,
    status: "PUBLISHED",
    AND: [
      {
        OR: [
          { createdById: null },
          { createdById: { not: userId } },
        ],
      },
      {
        OR: [
          { assignees: { has: userId } },
          { assignees: { has: "everyone" } },
          { assignees: { has: "Everyone" } },
          { assignees: { isEmpty: true } },
        ],
      },
    ],
  },
      include: {
        submissions: {
          where: { userId },
          select: {
            id: true,
            status: true,
            grade: true,
            feedback: true,
            submittedAt: true,
            fileUrl: true,
            textEntry: true,
            websiteUrl: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // Fetch forms assigned to this user but NOT created by them
    const forms = await prisma.form.findMany({
  where: {
    courseId,
    published: true,
    AND: [
      {
        OR: [
          { authorId: null },
          { authorId: { not: userId } },
        ],
      },
      {
        OR: [
          { assignTo: { has: userId } },
          { assignTo: { has: "everyone" } },
          { assignTo: { has: "Everyone" } },
          { assignTo: { isEmpty: true } },
        ],
      },
    ],
  },
      include: {
        formSubmissions: {
          where: { userId },
          select: {
            id: true,
            score: true,
            createdAt: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    const assignmentRows = assignments.map((a) => {
      const sub = a.submissions[0] ?? null;
      return {
        id: a.id,
        title: a.title,
        points: a.points,
        dueDate: a.dueDate ? a.dueDate.toISOString() : null,
        assignmentGroup: a.assignmentGroup,
        // ✅ Include displayGradeAs so the frontend can format correctly
        displayGradeAs: a.displayGradeAs ?? "Points",
        type: "assignment" as const,
        submission: sub
          ? {
              submissionId: sub.id,
              status: sub.status,
              grade: sub.grade,
              feedback: sub.feedback,
              submittedAt: sub.submittedAt ? sub.submittedAt.toISOString() : null,
              fileUrl: sub.fileUrl,
              textEntry: sub.textEntry,
              websiteUrl: sub.websiteUrl,
              hasSubmission: true,
            }
          : null,
      };
    });

    const formRows = forms.map((f) => {
      const sub = f.formSubmissions[0] ?? null;
      return {
        id: f.id,
        title: f.title,
        points: f.points,
        dueDate: f.dueDate ? f.dueDate.toISOString() : null,
        assignmentGroup: f.assignmentGroup,
        // Forms always display as Points
        displayGradeAs: "Points",
        type: "form" as const,
        submission: sub
          ? {
              submissionId: sub.id,
              status: "SUBMITTED",
              grade: sub.score,
              feedback: null,
              submittedAt: sub.createdAt ? sub.createdAt.toISOString() : null,
              fileUrl: null,
              textEntry: null,
              websiteUrl: null,
              hasSubmission: true,
            }
          : null,
      };
    });

    return NextResponse.json({
      assignments: assignmentRows,
      quizzes: [],
      forms: formRows,
    });
  } catch (error) {
    console.error("❌ GRADES ERROR:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}