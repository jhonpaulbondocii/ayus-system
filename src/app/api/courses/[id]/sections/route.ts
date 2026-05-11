// src/app/api/courses/[id]/sections/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;

  const access = await requireCoursePermission(courseId, "view_course");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const enrollments = await prisma.courseEnrollment.findMany({
    where:   { courseId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Distinct section names (non-empty strings only)
  const sectionNames = Array.from(
    new Set(
      enrollments
        .map(e => e.section)
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    )
  );

  const sections = sectionNames.map((name, i) => ({ id: String(i + 1), name }));

  const staff = enrollments.map(e => ({
    id:   e.user.id,
    name: e.user.name ?? "",
  }));

  return NextResponse.json({ sections, staff });
}