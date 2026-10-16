// src/app/api/courses/[id]/medical-certificates/[certId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; certId: string }> }
) {
  try {
    const { id: courseId, certId } = await params;

    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const existing = await prisma.medicalCertificate.findUnique({ where: { id: certId } });
    if (!existing || existing.courseId !== courseId) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }

    const body = await req.json();
    const { purpose, diagnosis, recommendation, ptrNumber, visitDate } = body;

    const record = await prisma.medicalCertificate.update({
      where: { id: certId },
      data: {
        purpose:        purpose        ?? existing.purpose,
        diagnosis:      diagnosis      ?? existing.diagnosis,
        recommendation: recommendation ?? existing.recommendation,
        ptrNumber:      ptrNumber      ?? existing.ptrNumber,
        visitDate:      visitDate ? new Date(visitDate) : existing.visitDate,
      },
      include: {
        student:        { select: { id: true, studentNumber: true, name: true, age: true, birthDate: true, gender: true, course: true, address: true } },
        recordedByUser: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ record });
  } catch (err) {
    console.error("[PATCH /medical-certificates/[certId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; certId: string }> }
) {
  try {
    const { id: courseId, certId } = await params;

    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const record = await prisma.medicalCertificate.findUnique({
      where: { id: certId },
      select: { courseId: true, recordedBy: true },
    });

    if (!record || record.courseId !== courseId) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }

    const isHead  = access.courseRole === "Head";
    const isOwner = record.recordedBy === access.userId;
    if (!isHead && !isOwner) {
      return NextResponse.json({ error: "Not allowed to delete this record." }, { status: 403 });
    }

    await prisma.medicalCertificate.delete({ where: { id: certId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /medical-certificates/[certId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}