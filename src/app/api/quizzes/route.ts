// src/app/api/quizzes/route.ts
import { NextResponse }    from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }     from "@/lib/auth";
import { prisma }          from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const enrollments = await prisma.courseEnrollment.findMany({
    where:  { userId },
    select: { courseId: true },
  });
  const courseIds = enrollments.map((e) => e.courseId);

  if (courseIds.length === 0)
    return NextResponse.json({ quizzes: [], forms: [] });

  // Fetch published quizzes in enrolled courses
  const [quizzes, forms] = await Promise.all([
    prisma.quiz.findMany({
      where: {
        courseId:  { in: courseIds },
        published: true,
        OR: [
          { availableFrom: null },
          { availableFrom: { lte: new Date() } },
        ],
      },
      include: {
        course:   { select: { id: true, name: true, code: true, color: true } },
        attempts: {
          where:  { userId },
          select: { id: true, score: true, submittedAt: true },
          orderBy:{ submittedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { dueDate: "asc" },
    }),

    prisma.form.findMany({
      where: {
        courseId:  { in: courseIds },
        published: true,
        OR: [
          { availableFrom: null },
          { availableFrom: { lte: new Date() } },
        ],
      },
      include: {
        course: { select: { id: true, name: true, code: true, color: true } },
        formSubmissions: {
          where:  { userId },
          select: { id: true, score: true, createdAt: true },
          orderBy:{ createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const quizResult = quizzes.map((q) => ({
    id:          q.id,
    title:       q.title,
    description: q.description,
    quizType:    q.quizType,
    points:      q.points,
    dueDate:     q.dueDate?.toISOString() ?? null,
    course:      q.course,
    attempted:   q.attempts.length > 0,
    score:       q.attempts[0]?.score ?? null,
    submittedAt: q.attempts[0]?.submittedAt?.toISOString() ?? null,
  }));

  const formResult = forms.map((f) => ({
    id:          f.id,
    title:       f.title,
    description: f.description,
    formType:    f.formType,
    points:      f.points,
    dueDate:     f.dueDate?.toISOString() ?? null,
    course:      f.course,
    submitted:   f.formSubmissions.length > 0,
    score:       f.formSubmissions[0]?.score ?? null,
    submittedAt: f.formSubmissions[0]?.createdAt?.toISOString() ?? null,
  }));

  return NextResponse.json({ quizzes: quizResult, forms: formResult });
}