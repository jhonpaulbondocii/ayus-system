import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  const { id: courseId, formId } = await params;

  const [submissions, questions, form] = await Promise.all([
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
    // ── Fetch form to get the overall points ──
    prisma.form.findUnique({
      where: { id: formId },
      select: { points: true },
    }),
  ]);

  const questionMap = new Map(questions.map(q => [q.id, q]));
  const totalPoints = form?.points ?? 0;

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
            answer: a.value ?? null,
          };
        })
      : [];

    return {
      id: sub.id,
      createdAt: sub.createdAt,
      user: {
        name: sub.user?.name ?? null,
        email: sub.user?.email ?? "",
        courseRole: enrollment?.courseRole ?? "Unknown",
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
  const { formId } = await params;
  const body = await req.json();
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