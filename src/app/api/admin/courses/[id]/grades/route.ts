// src/app/api/admin/courses/[id]/grades/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: courseId } = await params;

    // Get all enrolled students
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId, courseRole: "Student" },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Get all published assignments for this course
    const assignments = await prisma.assignment.findMany({
      where: { courseId, status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        points: true,
        dueDate: true,
        assignmentGroup: true,
        doNotCount: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Get all published graded quizzes for this course
    const quizzes = await prisma.quiz.findMany({
      where: {
        courseId,
        published: true,
        quizType: { in: ["GRADED_QUIZ", "GRADED_SURVEY"] },
      },
      select: {
        id: true,
        title: true,
        points: true,
        dueDate: true,
        assignmentGroup: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const studentIds = enrollments.map((e) => e.userId);

    // Get all submissions for enrolled students
    const submissions = await prisma.submission.findMany({
      where: {
        assignmentId: { in: assignments.map((a) => a.id) },
        userId: { in: studentIds },
      },
      select: {
        id: true,
        userId: true,
        assignmentId: true,
        grade: true,
        status: true,
        submittedAt: true,
        feedback: true,
      },
    });

    // Get best quiz attempt per student per quiz
    const quizAttempts = await prisma.quizAttempt.findMany({
      where: {
        quizId: { in: quizzes.map((q) => q.id) },
        userId: { in: studentIds },
      },
      select: {
        id: true,
        userId: true,
        quizId: true,
        score: true,
        submittedAt: true,
      },
    });

    // Build best attempt map: { userId_quizId -> attempt }
    const bestAttemptMap: Record<string, { score: number; submittedAt: Date }> = {};
    for (const attempt of quizAttempts) {
      const key = `${attempt.userId}_${attempt.quizId}`;
      if (!bestAttemptMap[key] || attempt.score > bestAttemptMap[key].score) {
        bestAttemptMap[key] = {
          score: attempt.score,
          submittedAt: attempt.submittedAt,
        };
      }
    }

    // Build submission map: { userId_assignmentId -> submission }
    const submissionMap: Record<string, typeof submissions[0]> = {};
    for (const sub of submissions) {
      submissionMap[`${sub.userId}_${sub.assignmentId}`] = sub;
    }

    // Build student rows
    const students = enrollments.map((enrollment) => {
      const user = enrollment.user;

      const assignmentGrades = assignments.map((a) => {
        const sub = submissionMap[`${user.id}_${a.id}`];
        return {
          assignmentId: a.id,
          grade: sub?.grade ?? null,
          status: sub?.status ?? "PENDING",
          submittedAt: sub?.submittedAt?.toISOString() ?? null,
          feedback: sub?.feedback ?? null,
          submissionId: sub?.id ?? null,
        };
      });

      const quizGrades = quizzes.map((q) => {
        const attempt = bestAttemptMap[`${user.id}_${q.id}`];
        return {
          quizId: q.id,
          score: attempt?.score ?? null,
          submittedAt: attempt?.submittedAt?.toISOString() ?? null,
        };
      });

      // Calculate total: sum of all graded / sum of all possible points
      const totalEarned = [
        ...assignmentGrades
          .filter((g) => {
            const a = assignments.find((a) => a.id === g.assignmentId);
            return g.grade !== null && !a?.doNotCount;
          })
          .map((g) => g.grade as number),
        ...quizGrades.filter((g) => g.score !== null).map((g) => g.score as number),
      ].reduce((sum, v) => sum + v, 0);

      const totalPossible = [
        ...assignments.filter((a) => !a.doNotCount).map((a) => a.points),
        ...quizzes.map((q) => q.points),
      ].reduce((sum, v) => sum + v, 0);

      const percentage =
        totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        assignmentGrades,
        quizGrades,
        totalEarned,
        totalPossible,
        percentage,
      };
    });

    return NextResponse.json({
      students,
      assignments: assignments.map((a) => ({
        id: a.id,
        title: a.title,
        points: a.points,
        dueDate: a.dueDate?.toISOString() ?? null,
        assignmentGroup: a.assignmentGroup,
        type: "assignment",
      })),
      quizzes: quizzes.map((q) => ({
        id: q.id,
        title: q.title,
        points: q.points,
        dueDate: q.dueDate?.toISOString() ?? null,
        assignmentGroup: q.assignmentGroup,
        type: "quiz",
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/courses/[id]/grades error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}