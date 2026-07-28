// src/app/api/courses/[id]/guidance-log/courses/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const students = await prisma.student.findMany({
      where:  { course: { not: null } },
      select: { course: true },
      distinct: ["course"],
      orderBy: { course: "asc" },
    });

    const courses = students.map(s => s.course).filter(Boolean) as string[];
    return NextResponse.json({ courses });
  } catch (err) {
    console.error("[GET /guidance-log/courses]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}