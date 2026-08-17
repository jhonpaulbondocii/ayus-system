import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  const { id: courseId, formId } = await params;

  const form = await prisma.form.findFirst({
    where: { id: formId, courseId },
    select: { id: true },
  });
  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const [submissions, questions] = await Promise.all([
    prisma.formSubmission.findMany({
      where: { formId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            enrollments: {
              where: { courseId },
              select: { courseRole: true, section: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.formQuestion.findMany({
      where: { formId },
      orderBy: { order: "asc" },
    }),
    Promise.resolve(null),
  ]);

  const questionMap = new Map(questions.map(q => [q.id, q]));
  const totalPoints = questions.reduce((sum, q) => sum + (q.points ?? 0), 0);

  const enriched = submissions.map(sub => {
    const raw = sub.answers as { questionId: string; value: string }[];
    const enrollment = sub.user?.enrollments?.[0];

    const answers = Array.isArray(raw)
      ? raw.map(a => {
          const q = questionMap.get(a.questionId);
          return {
            questionId: a.questionId,
            question: q?.question ?? "Unknown question",
            type: q?.type ?? "short_answer",
            points: q?.points ?? 0,
            answer: (a.value ?? (a as Record<string, string>).answer) ?? null,
          };
        })
      : [];

    return {
      id: sub.id,
      createdAt: sub.createdAt,
      user: {
        name: sub.user?.name ?? null,
        email: sub.user?.email ?? "",
        courseRole: enrollment?.courseRole ?? "Staff",
        section: enrollment?.section ?? null,
      },
      score: sub.score,
      totalPoints, // ── Now uses form.points instead of sum of question points
      answers,
    };
  });

  return NextResponse.json({ submissions: enriched });
}

// ── PATCH: manual score update ────────────────────────────────────────────────
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  const { id: courseId, formId } = await params;
  const body = await req.json();

  const formExists = await prisma.form.findFirst({
    where: { id: formId, courseId },
    select: { id: true },
  });
  if (!formExists) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }
  const { submissionId, score } = body;

  if (!submissionId || score === undefined) {
    return NextResponse.json({ error: "Missing submissionId or score" }, { status: 400 });
  }

  const updated = await prisma.formSubmission.update({
    where: { id: submissionId },
    data: { score: parseFloat(String(score)) },
  });

  return NextResponse.json({ success: true, submission: updated });
}