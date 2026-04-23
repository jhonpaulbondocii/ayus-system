// src/app/api/admin/courses/[id]/quizzes/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";
import { QuizQuestionType } from "@/generated/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

interface IncomingQuestion {
  type: string;
  question: string;
  points?: number;
  correctAnswer?: string;
  order?: number;
  answers?: { text: string; correct: boolean; order?: number }[];
  matchPairs?: { left: string; right: string; order?: number }[];
}

function toQuizQuestionType(type: string): QuizQuestionType {
  const valid: QuizQuestionType[] = [
    "MULTIPLE_CHOICE", "TRUE_FALSE", "FILL_BLANK",
    "ESSAY", "FILE_UPLOAD", "MATCHING",
  ];
  const upper = type?.toUpperCase() as QuizQuestionType;
  return valid.includes(upper) ? upper : "MULTIPLE_CHOICE";
}

// ✅ GET — fetch all quizzes with author info (Head + Admin)
export async function GET(_req: NextRequest, { params }: Props) {
  try {
    const { id: courseId } = await params;

    const access = await requireCoursePermission(courseId, "manage_assignments");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const quizzes = await prisma.quiz.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
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

    const data = quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description ?? null,
      quizType: q.quizType,
      assignmentGroup: q.assignmentGroup,
      points: Number(q.points),
      shuffleAnswers: q.shuffleAnswers,
      timeLimit: q.timeLimit,
      allowMultipleAttempts: q.allowMultipleAttempts,
      attemptLimit: q.attemptLimit,
      scoreToKeep: q.scoreToKeep,
      viewResponses: q.viewResponses,
      onlyOnceAfterAttempt: q.onlyOnceAfterAttempt,
      showCorrectAnswers: q.showCorrectAnswers,
      showCorrectAnswersAt: q.showCorrectAnswersAt,
      hideCorrectAnswersAt: q.hideCorrectAnswersAt,
      showOneAtATime: q.showOneAtATime,
      lockQuestionsAfterAnswering: q.lockQuestionsAfterAnswering,
      accessCode: q.accessCode,
      ipFilter: q.ipFilter,
      assignTo: q.assignTo,
      dueDate: q.dueDate,
      availableFrom: q.availableFrom,
      availableUntil: q.availableUntil,
      published: q.published,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      // ── Author info ──
      authorId: q.authorId,
      authorName: q.author?.name ?? q.authorName ?? "Admin",
      authorRole: q.authorRole ?? "Admin",
      authorImage: q.author?.image ?? null,
      // ── Counts ──
      questionCount: q.questions.length,
      attemptCount: q._count.attempts,
      // ── Creator ID for ownership check ──
      createdByUserId: q.authorId,
      questions: q.questions.map((question) => ({
        id: question.id,
        type: question.type,
        question: question.question,
        points: Number(question.points),
        correctAnswer: question.correctAnswer,
        order: question.order,
        answers: question.answers.map((a) => ({
          id: a.id, text: a.text, correct: a.correct, order: a.order,
        })),
        matchPairs: question.matchPairs.map((mp) => ({
          id: mp.id, left: mp.left, right: mp.right, order: mp.order,
        })),
      })),
    }));

    return NextResponse.json({ quizzes: data });
  } catch (error) {
    console.error("ADMIN QUIZZES GET ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch quizzes." }, { status: 500 });
  }
}

// ✅ POST — create a new quiz with author info (Head + Admin)
export async function POST(req: NextRequest, { params }: Props) {
  try {
    const { id: courseId } = await params;

    const access = await requireCoursePermission(courseId, "manage_assignments");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json() as {
      title?: string;
      description?: string;
      quizType?: string;
      assignmentGroup?: string;
      points?: number;
      shuffleAnswers?: boolean;
      timeLimit?: number;
      allowMultipleAttempts?: boolean;
      attemptLimit?: number;
      scoreToKeep?: string;
      viewResponses?: boolean;
      onlyOnceAfterAttempt?: boolean;
      showCorrectAnswers?: boolean;
      showCorrectAnswersAt?: string;
      hideCorrectAnswersAt?: string;
      showOneAtATime?: boolean;
      lockQuestionsAfterAnswering?: boolean;
      accessCode?: string;
      ipFilter?: string;
      assignTo?: string[];
      dueDate?: string;
      availableFrom?: string;
      availableUntil?: string;
      published?: boolean;
      questions?: IncomingQuestion[];
    };

    const {
      title, description, quizType = "GRADED_QUIZ", assignmentGroup = "Assignments",
      points = 0, shuffleAnswers = false, timeLimit, allowMultipleAttempts = false,
      attemptLimit, scoreToKeep = "highest", viewResponses = true,
      onlyOnceAfterAttempt = false, showCorrectAnswers = true,
      showCorrectAnswersAt, hideCorrectAnswersAt, showOneAtATime = false,
      lockQuestionsAfterAnswering = false, accessCode, ipFilter, assignTo = [],
      dueDate, availableFrom, availableUntil, published = false, questions = [],
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    // ── Resolve author ──
    const authorId = access.userId ?? null;
    const authorSystemRole = access.systemRole ?? "STAFF";
    const authorCourseRole = access.courseRole ?? null;

    let authorRole = "Staff";
    if (authorSystemRole === "ADMIN") authorRole = "Admin";
    else if (authorCourseRole?.toLowerCase() === "head") authorRole = "Head";

    let authorName = "Admin";
    if (authorId) {
      const user = await prisma.user.findUnique({
        where: { id: authorId },
        select: { name: true },
      });
      if (user?.name) authorName = user.name;
    }

    const quiz = await prisma.quiz.create({
      data: {
        courseId,
        authorId,
        authorName,
        authorRole,
        title: String(title).trim(),
        description: description ? String(description) : null,
        quizType: quizType as Parameters<typeof prisma.quiz.create>[0]["data"]["quizType"],
        assignmentGroup,
        points: Number(points) || 0,
        shuffleAnswers: Boolean(shuffleAnswers),
        timeLimit: timeLimit ? Number(timeLimit) : null,
        allowMultipleAttempts: Boolean(allowMultipleAttempts),
        attemptLimit: attemptLimit ? Number(attemptLimit) : null,
        scoreToKeep,
        viewResponses: Boolean(viewResponses),
        onlyOnceAfterAttempt: Boolean(onlyOnceAfterAttempt),
        showCorrectAnswers: Boolean(showCorrectAnswers),
        showCorrectAnswersAt: showCorrectAnswersAt ? new Date(showCorrectAnswersAt) : null,
        hideCorrectAnswersAt: hideCorrectAnswersAt ? new Date(hideCorrectAnswersAt) : null,
        showOneAtATime: Boolean(showOneAtATime),
        lockQuestionsAfterAnswering: Boolean(lockQuestionsAfterAnswering),
        accessCode: accessCode ? String(accessCode) : null,
        ipFilter: ipFilter ? String(ipFilter) : null,
        assignTo: Array.isArray(assignTo) ? assignTo : [],
        dueDate: dueDate ? new Date(dueDate) : null,
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        availableUntil: availableUntil ? new Date(availableUntil) : null,
        published: Boolean(published),
        questions: {
          create: questions.map((q: IncomingQuestion, idx: number) => ({
            type: toQuizQuestionType(q.type),
            question: q.question,
            points: Number(q.points) || 1,
            correctAnswer: q.correctAnswer ?? null,
            order: q.order ?? idx,
            answers: {
              create: (q.answers ?? []).map((a, ai) => ({
                text: a.text, correct: Boolean(a.correct), order: a.order ?? ai,
              })),
            },
            matchPairs: {
              create: (q.matchPairs ?? []).map((mp, mi) => ({
                left: mp.left, right: mp.right, order: mp.order ?? mi,
              })),
            },
          })),
        },
      },
      include: {
        author: { select: { id: true, name: true, role: true, image: true } },
        questions: {
          include: {
            answers: { orderBy: { order: "asc" } },
            matchPairs: { orderBy: { order: "asc" } },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json({
      quiz: {
        ...quiz,
        authorName: quiz.author?.name ?? quiz.authorName,
        authorRole: quiz.authorRole,
        authorImage: quiz.author?.image ?? null,
        createdByUserId: quiz.authorId,
        points: Number(quiz.points),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("ADMIN QUIZZES POST ERROR:", error);
    return NextResponse.json({ error: "Failed to create quiz." }, { status: 500 });
  }
}