// src/app/api/admin/courses/[id]/sections/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Fetch course info (as the "section")
  const course = await prisma.course.findUnique({
    where:  { id },
    select: { id: true, name: true, code: true },
  });

  // Fetch all enrolled users (as "staff")
  const enrollments = await prisma.courseEnrollment.findMany({
    where:   { courseId: id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const sections = course
    ? [{ id: course.id, name: course.code || course.name }]
    : [];

  const staff = enrollments.map(e => ({
    id:   e.user.id,
    name: e.user.name,
  }));

  return NextResponse.json({ sections, staff });
}