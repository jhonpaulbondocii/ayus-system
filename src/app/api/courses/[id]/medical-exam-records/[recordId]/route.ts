// src/app/api/courses/[id]/medical-exam-records/[recordId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const { id: courseId, recordId } = await params;

    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const existing = await prisma.medicalExamRecord.findUnique({
      where: { id: recordId },
    });
    if (!existing || existing.courseId !== courseId) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }

    const body = await req.json();
    const {
      height, weight, heartRate, bloodPressure, temperature, respiratoryRate,
      physicalSigns,
      isPregnant, lastMenstrualPeriod,
      civilStatus,
      remarks,
      fitnessStatus, fitnessFor, clearanceRemarks,
    } = body;

    const wasCleared  = !!existing.fitnessStatus;
    const nowClearing = !!fitnessStatus && !wasCleared;

    const record = await prisma.medicalExamRecord.update({
      where: { id: recordId },
      data: {
        height:              height              ?? existing.height,
        weight:              weight              ?? existing.weight,
        heartRate:           heartRate           ?? existing.heartRate,
        bloodPressure:       bloodPressure       ?? existing.bloodPressure,
        temperature:         temperature         ?? existing.temperature,
        respiratoryRate:     respiratoryRate     ?? existing.respiratoryRate,
        physicalSigns:       physicalSigns       ?? existing.physicalSigns,
        isPregnant:          isPregnant          ?? existing.isPregnant,
        lastMenstrualPeriod: lastMenstrualPeriod ?? existing.lastMenstrualPeriod,
        civilStatus:         civilStatus         ?? existing.civilStatus,
        remarks:             remarks             ?? existing.remarks,
        fitnessStatus:       fitnessStatus       ?? existing.fitnessStatus,
        fitnessFor:          fitnessFor          ?? existing.fitnessFor,
        clearanceRemarks:    clearanceRemarks    ?? existing.clearanceRemarks,
        clearanceIssuedAt:   nowClearing ? new Date() : existing.clearanceIssuedAt,
      },
      include: {
        student:        true,
        recordedByUser: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ record });
  } catch (err) {
    console.error("[PATCH /medical-exam-records/[recordId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    const record = await prisma.medicalExamRecord.findUnique({
      where: { id: recordId },
      select: { courseId: true, recordedBy: true },
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }

    if (record.courseId !== courseId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const isHead  = access.courseRole === "Head";
    const isOwner = record.recordedBy === access.userId;
    if (!isHead && !isOwner) {
      return NextResponse.json({ error: "Not allowed to delete this record." }, { status: 403 });
    }

    await prisma.medicalExamRecord.delete({ where: { id: recordId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /medical-exam-records/[recordId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}