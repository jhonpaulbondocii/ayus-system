// src/app/api/courses/[id]/patient-records/[recordId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/courses/[id]/patient-records/[recordId]
// Get all visits of a specific student (for the detail/history view)
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const { id: courseId, recordId } = await params;

    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { officeType: true },
    });
    if (course?.officeType !== "CLINIC") {
      return NextResponse.json({ error: "Not a clinic office" }, { status: 403 });
    }

    // Get the record to find the studentId
    const record = await prisma.patientRecord.findUnique({
      where: { id: recordId },
      select: { studentId: true },
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Get all visits of this student in this clinic
    const visits = await prisma.patientRecord.findMany({
      where: {
        courseId,
        studentId: record.studentId,
      },
      select: {
        id:            true,
        complaint:     true,
        temperature:   true,
        bloodPressure: true,
        pulseRate:     true,
        weight:        true,
        diagnosis:     true,
        medicine:      true,
        action:        true,
        notes:         true,
        visitDate:     true,
        createdAt:     true,
        student: {
          select: {
            id:            true,
            studentNumber: true,
            name:          true,
            age:           true,
            gender:        true,
            course:        true,
          },
        },
        recordedByUser: {
          select: {
            id:   true,
            name: true,
          },
        },
      },
      orderBy: { visitDate: "desc" },
    });

    return NextResponse.json({ visits });
  } catch (err) {
    console.error("[GET /patient-records/[recordId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/courses/[id]/patient-records/[recordId]
// Head can delete any record
// Staff can only delete their own records
// Admin cannot delete
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const { id: courseId, recordId } = await params;

    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Admin cannot delete patient records
    if (access.systemRole === "ADMIN") {
      return NextResponse.json(
        { error: "Admins cannot delete patient records" },
        { status: 403 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { officeType: true },
    });
    if (course?.officeType !== "CLINIC") {
      return NextResponse.json({ error: "Not a clinic office" }, { status: 403 });
    }

    const record = await prisma.patientRecord.findUnique({
      where: { id: recordId },
      select: { courseId: true, recordedBy: true },
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    if (record.courseId !== courseId) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const isHead  = access.courseRole?.includes("Head");
    const isOwner = record.recordedBy === access.userId;

    // Head can delete any record, Staff can only delete their own
    if (!isHead && !isOwner) {
      return NextResponse.json(
        { error: "You can only delete records you created" },
        { status: 403 }
      );
    }

    await prisma.patientRecord.delete({ where: { id: recordId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /patient-records/[recordId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}