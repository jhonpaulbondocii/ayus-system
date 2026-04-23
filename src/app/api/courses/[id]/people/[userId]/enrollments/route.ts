// src/app/api/courses/[id]/people/[userId]/enrollments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_COURSE_ROLES = new Set(["Teacher","Student","TA","Observer","Designer"]);
const normalizeRole = (r: string | null | undefined) => {
  if (!r) return "Student";
  if (VALID_COURSE_ROLES.has(r)) return r;
  for (const v of VALID_COURSE_ROLES) if (v.toLowerCase() === r.toLowerCase()) return v;
  return "Student";
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;

  const enrollments = await prisma.courseEnrollment.findMany({
    where: { userId },
    include: {
      course: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const result = enrollments.map(e => ({
    courseId:   e.courseId,
    courseName: e.course.name,
    role:       normalizeRole(e.courseRole),
    createdAt:  e.createdAt.toISOString(),
  }));

  return NextResponse.json({ enrollments: result });
}