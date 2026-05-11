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

    const enrollments = await prisma.courseEnrollment.findMany({
      where: {
        courseId,
        courseRole: { not: "Admin" },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            position: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const assignments = await prisma.assignment.findMany({
      where: {
        courseId,
        status: "PUBLISHED",
      },
      select: {
  id: true,
  title: true,
  points: true,
  dueDate: true,
  assignmentGroup: true,
  doNotCount: true,
  displayGradeAs: true,
  createdById: true,
},
      orderBy: { createdAt: "asc" },
    });

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
        authorId: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // ── FIXED: removed formType filter so all published forms appear ──
    const forms = await prisma.form.findMany({
      where: {
        courseId,
        published: true,
      },
      select: {
        id: true,
        title: true,
        points: true,
        dueDate: true,
        assignmentGroup: true,
        authorId: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const enrolledIds = enrollments.map((e) => e.userId);
    const assignmentIds = assignments.map((a) => a.id);
    const quizIds = quizzes.map((q) => q.id);
    const formIds = forms.map((f) => f.id);

    const submissions =
      assignmentIds.length > 0 && enrolledIds.length > 0
        ? await prisma.submission.findMany({
            where: {
              assignmentId: { in: assignmentIds },
              userId: { in: enrolledIds },
            },
            select: {
              id: true,
              userId: true,
              assignmentId: true,
              grade: true,
              status: true,
              submittedAt: true,
              feedback: true,
              fileUrl: true,
              textEntry: true,
              websiteUrl: true,
              comments: true,
            },
          })
        : [];

    const quizAttempts =
      quizIds.length > 0 && enrolledIds.length > 0
        ? await prisma.quizAttempt.findMany({
            where: {
              quizId: { in: quizIds },
              userId: { in: enrolledIds },
            },
            select: {
              id: true,
              userId: true,
              quizId: true,
              score: true,
              submittedAt: true,
            },
          })
        : [];

    const formSubmissions =
      formIds.length > 0 && enrolledIds.length > 0
        ? await prisma.formSubmission.findMany({
            where: {
              formId: { in: formIds },
              userId: { in: enrolledIds },
            },
            select: {
              id: true,
              userId: true,
              formId: true,
              score: true,
              createdAt: true,
            },
          })
        : [];

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

    const submissionMap: Record<string, (typeof submissions)[0]> = {};
    for (const sub of submissions) {
      submissionMap[`${sub.userId}_${sub.assignmentId}`] = sub;
    }

    const formSubmissionMap: Record<string, (typeof formSubmissions)[0]> = {};
    for (const fsub of formSubmissions) {
      formSubmissionMap[`${fsub.userId}_${fsub.formId}`] = fsub;
    }

    const staffRows = enrollments.map((enrollment) => {
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
    hasSubmission: !!sub?.submittedAt,
    fileUrl: sub?.fileUrl ?? null,
    textEntry: sub?.textEntry ?? null,
    websiteUrl: sub?.websiteUrl ?? null,
    displayGradeAs: a.displayGradeAs ?? "Points",
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

      const formGrades = forms.map((f) => {
        const fsub = formSubmissionMap[`${user.id}_${f.id}`];
        return {
          formId: f.id,
          score: fsub?.score ?? null,
          submittedAt: fsub?.createdAt?.toISOString() ?? null,
          submissionId: fsub?.id ?? null,
          hasSubmission: !!fsub,
        };
      });

      const totalEarned = [
        ...assignmentGrades
          .filter((g) => {
            const a = assignments.find((a) => a.id === g.assignmentId);
            return g.grade !== null && !a?.doNotCount;
          })
          .map((g) => g.grade as number),
        ...quizGrades
          .filter((g) => g.score !== null)
          .map((g) => g.score as number),
        ...formGrades
          .filter((g) => g.score !== null)
          .map((g) => g.score as number),
      ].reduce((sum, v) => sum + v, 0);

      const totalPossible = [
        ...assignments.filter((a) => !a.doNotCount).map((a) => a.points),
        ...quizzes.map((q) => q.points),
        ...forms.map((f) => f.points),
      ].reduce((sum, v) => sum + v, 0);

      const percentage =
        totalPossible > 0
          ? Math.round((totalEarned / totalPossible) * 100)
          : null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        position: user.position ?? null,
        courseRole: enrollment.courseRole,
        assignmentGrades,
        quizGrades,
        formGrades,
        totalEarned,
        totalPossible,
        percentage,
      };
    });

    return NextResponse.json({
      staff: staffRows,
      assignments: assignments.map((a) => ({
  id: a.id,
  title: a.title,
  points: a.points,
  dueDate: a.dueDate?.toISOString() ?? null,
  assignmentGroup: a.assignmentGroup ?? "Assignments",
  doNotCount: a.doNotCount,
  displayGradeAs: a.displayGradeAs ?? "Points",
  type: "assignment" as const,
})),
      quizzes: quizzes.map((q) => ({
        id: q.id,
        title: q.title,
        points: q.points,
        dueDate: q.dueDate?.toISOString() ?? null,
        assignmentGroup: q.assignmentGroup ?? "Assignments",
        type: "quiz" as const,
      })),
      forms: forms.map((f) => ({
        id: f.id,
        title: f.title,
        points: f.points,
        dueDate: f.dueDate?.toISOString() ?? null,
        assignmentGroup: f.assignmentGroup ?? "Assignments",
        type: "form" as const,
      })),
    });
  } catch (error) {
    console.error("GET /api/admin/courses/[id]/grades error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}