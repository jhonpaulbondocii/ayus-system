// src/app/api/courses/[id]/quizzes/[quizId]/attempts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

type Props = {
  params: Promise<{ id: string; quizId: string }>;
};

function autoGrade(
  questions: {
    id: string;
    type: string;
    points: number;
    correctAnswer: string | null;
    answers: { id: string; text: string; correct: boolean }[];
    matchPairs: { id: string; left: string; right: string }[];
  }[],
  answers: Record<string, string | string[] | Record<string, string>>
): number {
  let score = 0;

  for (const q of questions) {
    const userAnswer = answers[q.id];
    if (userAnswer === undefined || userAnswer === null) continue;

    switch (q.type) {
      case "MULTIPLE_CHOICE":
      case "TRUE_FALSE": {
        // userAnswer is a string (the text of the chosen option)
        const correctOption = q.answers.find((a) => a.correct);
        if (correctOption && userAnswer === correctOption.text) {
          score += q.points;
        }
        break;
      }

      case "FILL_BLANK": {
        // Case-insensitive exact match against correctAnswer
        const correct = (q.correctAnswer ?? "").trim().toLowerCase();
        const given = (typeof userAnswer === "string" ? userAnswer : "")
          .trim()
          .toLowerCase();
        if (correct && given === correct) {
          score += q.points;
        }
        break;
      }

      case "MATCHING": {
        // userAnswer is Record<left, userRightAnswer>
        if (typeof userAnswer !== "object" || Array.isArray(userAnswer)) break;
        const gridAnswer = userAnswer as Record<string, string>;
        let allCorrect = true;
        for (const pair of q.matchPairs) {
          const given = (gridAnswer[pair.left] ?? "").trim().toLowerCase();
          const correct = pair.right.trim().toLowerCase();
          if (given !== correct) { allCorrect = false; break; }
        }
        if (allCorrect && q.matchPairs.length > 0) {
          score += q.points;
        }
        break;
      }

      // ESSAY and FILE_UPLOAD are not auto-graded
      case "ESSAY":
      case "FILE_UPLOAD":
      default:
        break;
    }
  }

  return score;
}

// ✅ POST — submit a quiz attempt
export async function POST(req: NextRequest, { params }: Props) {
  try {
    const { id: courseId, quizId } = await params;

    const access = await requireCoursePermission(courseId, "submit_assignments");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { userId } = access;

    // Fetch the quiz with questions
    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, courseId, published: true },
      include: {
        questions: {
          include: {
            answers: true,
            matchPairs: true,
          },
          orderBy: { order: "asc" },
        },
        attempts: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
    }

    // Check availability window
    const now = new Date();
    if (quiz.availableFrom && now < new Date(quiz.availableFrom)) {
      return NextResponse.json({ error: "Quiz is not yet available." }, { status: 403 });
    }
    if (quiz.availableUntil && now > new Date(quiz.availableUntil)) {
      return NextResponse.json({ error: "Quiz is no longer available." }, { status: 403 });
    }

    // Check attempt limits
    const attemptCount = quiz.attempts.length;
    if (!quiz.allowMultipleAttempts && attemptCount > 0) {
      return NextResponse.json(
        { error: "You have already submitted this quiz." },
        { status: 403 }
      );
    }
    if (quiz.attemptLimit !== null && attemptCount >= quiz.attemptLimit) {
      return NextResponse.json(
        { error: "You have reached the maximum number of attempts." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { answers = {}, durationSeconds = 0 } = body as {
      answers: Record<string, string | string[] | Record<string, string>>;
      durationSeconds: number;
    };

    // Auto-grade
    const score = autoGrade(quiz.questions, answers);

    // Persist attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        userId,
        score,
        durationSeconds: Number(durationSeconds) || 0,
        submittedAt: new Date(),
        answers: answers as object,
      },
    });

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        score: attempt.score,
        durationSeconds: attempt.durationSeconds,
        submittedAt: attempt.submittedAt,
      },
      score,
      showResults: quiz.viewResponses,
    });
  } catch (error) {
    console.error("QUIZ ATTEMPT POST ERROR:", error);
    return NextResponse.json(
      { error: "Failed to submit quiz attempt." },
      { status: 500 }
    );
  }
}

// ✅ GET — fetch attempts for current user
export async function GET(_req: NextRequest, { params }: Props) {
  try {
    const { id: courseId, quizId } = await params;

    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { userId } = access;

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId, userId },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        score: true,
        durationSeconds: true,
        submittedAt: true,
        answers: true,
      },
    });

    return NextResponse.json({ attempts });
  } catch (error) {
    console.error("QUIZ ATTEMPT GET ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch attempts." },
      { status: 500 }
    );
  }
}