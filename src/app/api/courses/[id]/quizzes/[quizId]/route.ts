import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "STAFF";
};

async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!user) return null;

  return user;
}

function isQuizOpen(quiz: {
  availableFrom: Date | null;
  availableUntil: Date | null;
}): boolean {
  const now = new Date();

  if (quiz.availableFrom && new Date(quiz.availableFrom) > now) return false;
  if (quiz.availableUntil && new Date(quiz.availableUntil) < now) return false;

  return true;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; quizId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: courseId, quizId } = await params;

    const enrollment = await prisma.courseEnrollment.findFirst({
      where: {
        courseId,
        userId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!enrollment && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        courseId,
        published: true,
      },
      include: {
        questions: {
          orderBy: {
            order: "asc",
          },
          include: {
            answers: {
              orderBy: {
                order: "asc",
              },
              select: {
                id: true,
                text: true,
                order: true,
              },
            },
            matchPairs: {
              orderBy: {
                order: "asc",
              },
              select: {
                id: true,
                left: true,
                right: true,
                order: true,
              },
            },
          },
        },
        attempts: {
          where: {
            userId: user.id,
          },
          orderBy: {
            submittedAt: "desc",
          },
          select: {
            id: true,
            score: true,
            submittedAt: true,
            durationSeconds: true,
            answers: true,
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const attemptCount = quiz.attempts.length;
    const latestAttempt = quiz.attempts[0] ?? null;
    const open = isQuizOpen(quiz);

    const canTake =
      open &&
      (quiz.allowMultipleAttempts || attemptCount === 0) &&
      (!quiz.attemptLimit || attemptCount < quiz.attemptLimit);

    const totalPoints = quiz.questions.reduce<number>((sum, question) => {
      return sum + Number(question.points || 0);
    }, 0);

    const questions = quiz.questions.map((question) => ({
      id: question.id,
      type: question.type,
      question: question.question,
      points: Number(question.points),
      options: question.answers.map((answer) => ({
        id: answer.id,
        text: answer.text,
      })),
      matchPairs: question.matchPairs.map((pair) => ({
        id: pair.id,
        left: pair.left,
        right: pair.right,
      })),
    }));

    return NextResponse.json({
      quiz: {
        courseId,
        id: quiz.id,
        title: quiz.title,
        description: quiz.description ?? "",
        quizType: quiz.quizType,
        assignmentGroup: quiz.assignmentGroup,
        points: Number(quiz.points),
        totalPoints,
        dueDate: quiz.dueDate,
        availableFrom: quiz.availableFrom,
        availableUntil: quiz.availableUntil,
        published: quiz.published,
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
        hasAccessCode: Boolean(quiz.accessCode),
        dueOpen: open,
        canTake,
        attemptCount,
        latestAttempt: latestAttempt
          ? {
              id: latestAttempt.id,
              score: Number(latestAttempt.score),
              submittedAt: latestAttempt.submittedAt,
              durationSeconds: latestAttempt.durationSeconds,
              answers: latestAttempt.answers,
            }
          : null,
        questions,
      },
    });
  } catch (error) {
    console.error("GET /api/courses/[id]/quizzes/[quizId] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz detail" },
      { status: 500 }
    );
  }
}