// src/app/api/courses/[id]/patient-records/student-lookup/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    // Only Head, Staff, and Admin can look up students
    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Make sure this is a clinic office
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { officeType: true },
    });

    if (course?.officeType !== "CLINIC") {
      return NextResponse.json({ error: "Not a clinic office" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const studentNumber = searchParams.get("studentNumber")?.trim();

    if (!studentNumber) {
      return NextResponse.json({ error: "Student number is required" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { studentNumber },
      select: {
        id:            true,
        studentNumber: true,
        name:          true,
        email:         true,
        age:           true,
        gender:        true,
        course:        true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ student });
  } catch (err) {
    console.error("[GET /patient-records/student-lookup]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}