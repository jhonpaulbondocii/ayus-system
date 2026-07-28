// src/app/api/courses/[id]/guidance-log/student-lookup/route.ts

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

    const { searchParams } = new URL(req.url);
    const studentNumber = searchParams.get("studentNumber")?.trim();

    if (!studentNumber) {
      return NextResponse.json({ error: "studentNumber is required." }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { studentNumber },
      select: {
        id:            true,
        studentNumber: true,
        name:          true,
        email:         true,
        gender:        true,
        course:        true,
        age:           true,
        address:       true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    return NextResponse.json({ student });
  } catch (err) {
    console.error("[GET /guidance-log/student-lookup]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}