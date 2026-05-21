import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── GET: Fetch all submissions for a form ─────────────────────────────────────
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  try {
    const { formId } = await params;

    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: { questions: true },
    });

    const submissions = await prisma.formSubmission.findMany({
      where: { formId },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Shape the response to match what the drawer expects
    const shaped = submissions.map((sub) => {
      const questions: { id: string; question: string; type: string; points: number }[] =
        (form?.questions as { id: string; question: string; type: string; points: number }[]) ?? [];

      // answers can be stored as [{questionId, value}] or {questionId: value}
const rawAnswers = sub.answers as
  | { questionId: string; value: string }[]
  | Record<string, string>
  | null;

const answersArr: { questionId: string; answer: string | null }[] =
  Array.isArray(rawAnswers)
    ? rawAnswers.map((a) => ({ questionId: a.questionId, answer: a.value ?? null }))
    : Object.entries(rawAnswers ?? {}).map(([questionId, answer]) => ({
        questionId,
        answer: typeof answer === "string" ? answer : String(answer ?? ""),
      }));

const answers = answersArr.map(({ questionId, answer }) => {
  const q = questions.find((q) => q.id === questionId);
  return {
    questionId,
    question: q?.question ?? questionId,
    type:     q?.type    ?? "text",
    points:   q?.points  ?? 0,
    answer,
  };
});

      const totalPoints = questions.reduce((s, q) => s + (q.points ?? 0), 0);

      return {
        id:          sub.id,
        createdAt:   sub.createdAt,
        score:       sub.score ?? null,
        totalPoints,
        user: {
          name:       sub.user.name,
          email:      sub.user.email,
          courseRole: "Staff",
          section:    null,
        },
        answers,
      };
    });

    return NextResponse.json({ submissions: shaped });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── POST: Submit a response ───────────────────────────────────────────────────
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  try {
    const { formId } = await params;
    const body = await req.json();

    const existing = await prisma.formSubmission.findUnique({
      where: {
        formId_userId: {
          formId,
          userId: body.userId,
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
        userId: body.userId,
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