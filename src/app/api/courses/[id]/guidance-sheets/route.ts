// src/app/api/courses/[id]/guidance-sheets/route.ts
// PROTECTED — staff/head only

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
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const course = await prisma.course.findUnique({
      where:  { id: courseId },
      select: { officeType: true },
    });
    if (course?.officeType !== "GUIDANCE") {
      return NextResponse.json({ error: "Not a guidance office" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search  = searchParams.get("search")?.trim()  ?? "";
    const status  = searchParams.get("status")?.trim()  ?? "";
    const course_ = searchParams.get("course")?.trim()  ?? "";

    const sheets = await prisma.guidanceInfoSheet.findMany({
      where: {
        courseId,
        ...(status  ? { status }                                                        : {}),
        ...(course_ ? { courseProgram: course_ }                                        : {}),
        ...(search  ? {
          OR: [
            { name:      { contains: search, mode: "insensitive" } },
            { studentNo: { contains: search, mode: "insensitive" } },
            { email:     { contains: search, mode: "insensitive" } },
          ],
        } : {}),
      },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json({ sheets });

  } catch (err) {
    console.error("[GET /guidance-sheets]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}