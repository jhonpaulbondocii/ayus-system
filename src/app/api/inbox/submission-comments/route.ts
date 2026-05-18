import { NextResponse }     from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }      from "@/lib/auth";
import { prisma }           from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const submissions = await prisma.submission.findMany({
    where: {
      userId,
      feedback: { not: null },
    },
    include: {
      assignment: {
        include: {
          course: {
            select: { id: true, name: true, code: true, color: true },
          },
        },
      },
      gradedBy: {
        select: { id: true, name: true, image: true, role: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  const comments = submissions.map(s => ({
    id:        s.id,
    body:      s.feedback!,
    createdAt: (s.gradedAt ?? s.updatedAt).toISOString(),
    author: {
      id:    s.gradedBy?.id    ?? "system",
      name:  s.gradedBy?.name  ?? "Instructor",
      image: s.gradedBy?.image ?? null,
      role:  s.gradedBy?.role  ?? "staff",
    },
    assignment: {
      id:    s.assignment.id,
      title: s.assignment.title,
      course: s.assignment.course
        ? {
            id:    s.assignment.course.id,
            name:  s.assignment.course.name,
            code:  s.assignment.course.code,
            color: s.assignment.course.color,
          }
        : null,
    },
    grade:        s.grade,
    submissionId: s.id,
  }));

  return NextResponse.json({ comments });
}