// src/app/api/inbox/enrollments/route.ts
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
    where:   { userId },
    include: {
      course: {
        select: { id: true, name: true, code: true, color: true, image: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = enrollments.map((e) => ({
    id:         e.id,
    courseRole: e.courseRole,
    section:    e.section,
    createdAt:  e.createdAt.toISOString(),
    course:     e.course,
  }));

  return NextResponse.json({ enrollments: result });
}