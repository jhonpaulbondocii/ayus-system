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
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const user = await getCurrentUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { id: courseId } = await params;
      const url = new URL(request.url);
      const assigned = url.searchParams.get("assigned") === "true";
      const published = url.searchParams.get("published") === "true";

      console.log("[GET /api/courses/[id]/quizzes]", {
        userId: user.id,
        courseId,
        userRole: user.role,
        assigned,
        published,
      });

      const enrollment = await prisma.courseEnrollment.findFirst({
        where: {
          courseId,
          userId: user.id,
        },
        select: {
          id: true,
          section: true,
        },
      });

      console.log("[courseEnrollment]", enrollment);

      if (!enrollment && user.role !== "ADMIN") {
        console.log("[User not enrolled and not admin - returning Forbidden]");
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const quizzes = await prisma.quiz.findMany({
        where: {
          courseId,
          ...(published && { published: true }),
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          title: true,
          description: true,
          quizType: true,
          assignmentGroup: true,
          points: true,
          dueDate: true,
          availableFrom: true,
          availableUntil: true,
          published: true,
          showOneAtATime: true,
          lockQuestionsAfterAnswering: true,
          accessCode: true,
          allowMultipleAttempts: true,
          attemptLimit: true,
          viewResponses: true,
          assignTo: true,
          questions: {
            select: {
              id: true,
              type: true,
              question: true,
              description: true,
              points: true,
              correctAnswer: true,
              answers: true,
              matchPairs: true,
            },
            orderBy: {
              order: "asc",
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
            },
          },
        },
      });

      // Filter by assignTo if needed
      let filteredQuizzes = quizzes;
      if (assigned) {
        filteredQuizzes = quizzes.filter((quiz) => {
          // Allow admins to see all quizzes
          if (user.role === "ADMIN") return true;

          // Check if assigned to "Everyone"
          if (quiz.assignTo.includes("Everyone")) return true;

          // Check if assigned to the user's section
          if (enrollment?.section && quiz.assignTo.includes(enrollment.section)) {
            return true;
          }

          // Check if assigned to the user's ID
          if (quiz.assignTo.includes(user.id)) return true;

          return false;
        });
      }

      const data = filteredQuizzes.map((quiz) => {
        const latestAttempt = quiz.attempts[0] ?? null;
        const attemptCount = quiz.attempts.length;
        const submitted = attemptCount > 0;
        const lockedByAttempts = !quiz.allowMultipleAttempts && attemptCount > 0;

        return {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description ?? null,
          quizType: quiz.quizType,
          assignmentGroup: quiz.assignmentGroup,
          points: Number(quiz.points),
          dueDate: quiz.dueDate,
          availableFrom: quiz.availableFrom,
          availableUntil: quiz.availableUntil,
          published: quiz.published,
          showOneAtATime: quiz.showOneAtATime,
          lockQuestionsAfterAnswering: quiz.lockQuestionsAfterAnswering,
          accessCode: quiz.accessCode,
          allowMultipleAttempts: quiz.allowMultipleAttempts,
          allowMultipleResponses: quiz.allowMultipleAttempts, // For forms compatibility
          attemptLimit: quiz.attemptLimit,
          questions: quiz.questions.map((q) => ({
            id: q.id,
            type: q.type,
            question: q.question,
            description: q.description,
            points: Number(q.points),
            required: q.points > 0,
            correctAnswer: q.correctAnswer,
            answers: q.answers.map((a) => ({
              id: a.id,
              text: a.text,
              correct: a.correct,
            })),
            matchPairs: q.matchPairs.map((m) => ({
              id: m.id,
              left: m.left,
              right: m.right,
            })),
          })),
          questionCount: quiz.questions.length,
          attemptCount,
          submitted,
          score: latestAttempt?.score ? Number(latestAttempt.score) : undefined,
          showResultsToRespondents: quiz.viewResponses,
          isOpen: isQuizOpen(quiz),
          lockedByAttempts,
        };
      });

      return NextResponse.json({ quizzes: data });
    } catch (error) {
      console.error("GET /api/courses/[id]/quizzes error:", error);
      return NextResponse.json(
        { error: "Failed to fetch quizzes" },
        { status: 500 }
      );
    }
  }