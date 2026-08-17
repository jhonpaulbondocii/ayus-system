import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

// ── GET: Fetch all submissions for a form ─────────────────────────────────────
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  try {
    const { id: courseId, formId } = await params;

    const access = await requireCoursePermission(courseId, "manage_assignments");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const form = await prisma.form.findFirst({
      where: { id: formId, courseId },
      select: { questions: { orderBy: { order: "asc" } } },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const submissions = await prisma.formSubmission.findMany({
      where: { formId },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const userIds = submissions.map(s => s.userId);
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId, userId: { in: userIds } },
      select: { userId: true, courseRole: true, section: true },
    });
    const enrollmentMap = new Map(enrollments.map(e => [e.userId, e]));

    const questions = form.questions as {
      id: string; question: string; type: string; points: number;
    }[];

    const totalPoints = questions.reduce((s, q) => s + (q.points ?? 0), 0);

    const shaped = submissions.map(sub => {
      const enrollment = enrollmentMap.get(sub.userId);

      const rawAnswers = sub.answers as
        | { questionId: string; value: string }[]
        | Record<string, string>
        | null;

      const answersArr: { questionId: string; answer: string | null }[] =
        Array.isArray(rawAnswers)
          ? rawAnswers.map(a => ({
              questionId: a.questionId,
              answer: (a.value ?? (a as Record<string, string>).answer) ?? null,
            }))
          : Object.entries(rawAnswers ?? {}).map(([questionId, answer]) => ({
              questionId,
              answer: typeof answer === "string" ? answer : String(answer ?? ""),
            }));

      const answers = answersArr.map(({ questionId, answer }) => {
        const q = questions.find(q => q.id === questionId);
        return {
          questionId,
          question: q?.question ?? questionId,
          type:     q?.type    ?? "short_answer",
          points:   q?.points  ?? 0,
          answer,
        };
      });

      return {
        id:        sub.id,
        createdAt: sub.createdAt,
        score:     sub.score ?? null,
        totalPoints,
        user: {
          name:       sub.user.name,
          email:      sub.user.email,
          courseRole: enrollment?.courseRole ?? "Staff",
          section:    enrollment?.section    ?? null,
        },
        answers,
      };
    });

    return NextResponse.json({ submissions: shaped });
  } catch (error) {
    console.error("[GET submissions]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── POST: Submit a response ───────────────────────────────────────────────────
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  try {
    const { id: courseId, formId } = await params;

    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const userId = body.userId ?? access.userId;

    const existing = await prisma.formSubmission.findUnique({
      where: {
        formId_userId: {
          formId,
          userId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You have already submitted a response to this form." },
        { status: 409 }
      );
    }

    const submission = await prisma.formSubmission.create({
      data: {
        formId,
        userId,
        answers: body.answers,
        score: 0,
      },
    });

    return NextResponse.json({ success: true, submission });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2002") {
      return NextResponse.json(
        { error: "You have already submitted a response to this form." },
        { status: 409 }
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}