// src/app/api/admin/courses/[id]/quizzes/[quizId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";
import { QuizQuestionType } from "@/generated/prisma";

type Props = {
  params: Promise<{ id: string; quizId: string }>;
};

type IncomingQuestion = {
  type: string;
  question: string;
  points?: number;
  correctAnswer?: string;
  order?: number;
  answers?: { text: string; correct: boolean; order?: number }[];
  matchPairs?: { left: string; right: string; order?: number }[];
};

function toQuizQuestionType(type: string): QuizQuestionType {
  const valid: QuizQuestionType[] = [
    "MULTIPLE_CHOICE",
    "TRUE_FALSE",
    "FILL_BLANK",
    "ESSAY",
    "FILE_UPLOAD",
    "MATCHING",
  ];
  const upper = type?.toUpperCase() as QuizQuestionType;
  return valid.includes(upper) ? upper : "MULTIPLE_CHOICE";
}

// ✅ GET — fetch single quiz with all details (Head + Admin)
export async function GET(_req: NextRequest, { params }: Props) {
  try {
    const { id: courseId, quizId } = await params;

    const access = await requireCoursePermission(courseId, "manage_assignments");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, courseId },
      include: {
        author: {
          select: { id: true, name: true, role: true, image: true },
        },
        questions: {
          orderBy: { order: "asc" },
          include: {
            answers: { orderBy: { order: "asc" } },
            matchPairs: { orderBy: { order: "asc" } },
          },
        },
        attempts: {
          orderBy: { submittedAt: "desc" },
          select: {
            id: true,
            userId: true,
            score: true,
            durationSeconds: true,
            submittedAt: true,
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        _count: { select: { attempts: true } },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
    }

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        courseId: quiz.courseId,
        title: quiz.title,
        description: quiz.description ?? null,
        quizType: quiz.quizType,
        assignmentGroup: quiz.assignmentGroup,
        points: Number(quiz.points),
        shuffleAnswers: quiz.shuffleAnswers,
        timeLimit: quiz.timeLimit,
        allowMultipleAttempts: quiz.allowMultipleAttempts,
        attemptLimit: quiz.attemptLimit,
        scoreToKeep: quiz.scoreToKeep,
        viewResponses: quiz.viewResponses,
        onlyOnceAfterAttempt: quiz.onlyOnceAfterAttempt,
        showCorrectAnswers: quiz.showCorrectAnswers,
        showCorrectAnswersAt: quiz.showCorrectAnswersAt,
        hideCorrectAnswersAt: quiz.hideCorrectAnswersAt,
        showOneAtATime: quiz.showOneAtATime,
        lockQuestionsAfterAnswering: quiz.lockQuestionsAfterAnswering,
        accessCode: quiz.accessCode,
        ipFilter: quiz.ipFilter,
        assignTo: quiz.assignTo,
        dueDate: quiz.dueDate,
        availableFrom: quiz.availableFrom,
        availableUntil: quiz.availableUntil,
        published: quiz.published,
        createdAt: quiz.createdAt,
        updatedAt: quiz.updatedAt,
        // ── Author info ──
        authorId: quiz.authorId,
        authorName: quiz.author?.name ?? quiz.authorName ?? "Admin",
        authorRole: quiz.authorRole ?? "Admin",
        authorImage: quiz.author?.image ?? null,
        // ── Counts ──
        questionCount: quiz.questions.length,
        attemptCount: quiz._count.attempts,
        questions: quiz.questions.map((q) => ({
          id: q.id,
          type: q.type,
          question: q.question,
          points: Number(q.points),
          correctAnswer: q.correctAnswer,
          order: q.order,
          answers: q.answers.map((a) => ({
            id: a.id,
            text: a.text,
            correct: a.correct,
            order: a.order,
          })),
          matchPairs: q.matchPairs.map((mp) => ({
            id: mp.id,
            left: mp.left,
            right: mp.right,
            order: mp.order,
          })),
        })),
        attempts: quiz.attempts.map((at) => ({
          id: at.id,
          userId: at.userId,
          score: Number(at.score),
          durationSeconds: at.durationSeconds,
          submittedAt: at.submittedAt,
          userName: at.user.name,
          userEmail: at.user.email,
          userImage: at.user.image,
        })),
      },
    });
  } catch (error) {
    console.error("ADMIN QUIZ GET ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch quiz." }, { status: 500 });
  }
}

// ✅ PATCH — update quiz (Head + Admin)
export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    const { id: courseId, quizId } = await params;

    const access = await requireCoursePermission(courseId, "manage_assignments");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const existing = await prisma.quiz.findFirst({ where: { id: quizId, courseId } });
    if (!existing) {
      return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
    }

    const body = await req.json();

    const {
      title, description, quizType, assignmentGroup, points, shuffleAnswers,
      timeLimit, allowMultipleAttempts, attemptLimit, scoreToKeep, viewResponses,
      onlyOnceAfterAttempt, showCorrectAnswers, showCorrectAnswersAt,
      hideCorrectAnswersAt, showOneAtATime, lockQuestionsAfterAnswering,
      accessCode, ipFilter, assignTo, dueDate, availableFrom, availableUntil,
      published, questions,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (title !== undefined) updateData.title = String(title).trim();
    if (description !== undefined) updateData.description = description ? String(description) : null;
    if (quizType !== undefined) updateData.quizType = quizType;
    if (assignmentGroup !== undefined) updateData.assignmentGroup = assignmentGroup;
    if (points !== undefined) updateData.points = Number(points) || 0;
    if (shuffleAnswers !== undefined) updateData.shuffleAnswers = Boolean(shuffleAnswers);
    if (timeLimit !== undefined) updateData.timeLimit = timeLimit ? Number(timeLimit) : null;
    if (allowMultipleAttempts !== undefined) updateData.allowMultipleAttempts = Boolean(allowMultipleAttempts);
    if (attemptLimit !== undefined) updateData.attemptLimit = attemptLimit ? Number(attemptLimit) : null;
    if (scoreToKeep !== undefined) updateData.scoreToKeep = scoreToKeep;
    if (viewResponses !== undefined) updateData.viewResponses = Boolean(viewResponses);
    if (onlyOnceAfterAttempt !== undefined) updateData.onlyOnceAfterAttempt = Boolean(onlyOnceAfterAttempt);
    if (showCorrectAnswers !== undefined) updateData.showCorrectAnswers = Boolean(showCorrectAnswers);
    if (showCorrectAnswersAt !== undefined) updateData.showCorrectAnswersAt = showCorrectAnswersAt ? new Date(showCorrectAnswersAt) : null;
    if (hideCorrectAnswersAt !== undefined) updateData.hideCorrectAnswersAt = hideCorrectAnswersAt ? new Date(hideCorrectAnswersAt) : null;
    if (showOneAtATime !== undefined) updateData.showOneAtATime = Boolean(showOneAtATime);
    if (lockQuestionsAfterAnswering !== undefined) updateData.lockQuestionsAfterAnswering = Boolean(lockQuestionsAfterAnswering);
    if (accessCode !== undefined) updateData.accessCode = accessCode ? String(accessCode) : null;
    if (ipFilter !== undefined) updateData.ipFilter = ipFilter ? String(ipFilter) : null;
    if (assignTo !== undefined) updateData.assignTo = Array.isArray(assignTo) ? assignTo : [];
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (availableFrom !== undefined) updateData.availableFrom = availableFrom ? new Date(availableFrom) : null;
    if (availableUntil !== undefined) updateData.availableUntil = availableUntil ? new Date(availableUntil) : null;
    if (published !== undefined) updateData.published = Boolean(published);

    if (Array.isArray(questions)) {
      await prisma.quizQuestion.deleteMany({ where: { quizId } });
      updateData.questions = {
        create: (questions as IncomingQuestion[]).map((q, idx) => ({
          type: toQuizQuestionType(q.type),
          question: q.question,
          points: Number(q.points) || 1,
          correctAnswer: q.correctAnswer ?? null,
          order: q.order ?? idx,
          answers: {
            create: (q.answers ?? []).map((a, ai) => ({
              text: a.text,
              correct: Boolean(a.correct),
              order: a.order ?? ai,
            })),
          },
          matchPairs: {
            create: (q.matchPairs ?? []).map((mp, mi) => ({
              left: mp.left,
              right: mp.right,
              order: mp.order ?? mi,
            })),
          },
        })),
      };
    }

    const updated = await prisma.quiz.update({
      where: { id: quizId },
      data: updateData,
      include: {
        author: { select: { id: true, name: true, role: true, image: true } },
        questions: {
          orderBy: { order: "asc" },
          include: {
            answers: { orderBy: { order: "asc" } },
            matchPairs: { orderBy: { order: "asc" } },
          },
        },
        _count: { select: { attempts: true } },
      },
    });

    return NextResponse.json({
      quiz: {
        ...updated,
        authorName: updated.author?.name ?? updated.authorName,
        authorRole: updated.authorRole,
        authorImage: updated.author?.image ?? null,
        points: Number(updated.points),
      },
    });
  } catch (error) {
    console.error("ADMIN QUIZ PATCH ERROR:", error);
    return NextResponse.json({ error: "Failed to update quiz." }, { status: 500 });
  }
}

// ✅ PUT — full update/replace quiz (used by edit modal)
export async function PUT(req: NextRequest, { params }: Props) {
  return PATCH(req, { params });
}

// ✅ DELETE — delete quiz (Head + Admin)
export async function DELETE(_req: NextRequest, { params }: Props) {
  try {
    const { id: courseId, quizId } = await params;

    const access = await requireCoursePermission(courseId, "manage_assignments");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const existing = await prisma.quiz.findFirst({ where: { id: quizId, courseId } });
    if (!existing) {
      return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
    }

    await prisma.quiz.delete({ where: { id: quizId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ADMIN QUIZ DELETE ERROR:", error);
    return NextResponse.json({ error: "Failed to delete quiz." }, { status: 500 });
  }
}