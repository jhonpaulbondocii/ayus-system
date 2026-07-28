// src/app/api/courses/[id]/patient-records/[recordId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";
import { PatientAction } from "@/generated/prisma";

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

    function computeAge(birthDate: Date | null, fallbackAge: number | null): number | null {
      if (birthDate) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
      }
      return fallbackAge;
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
            birthDate:     true,
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

    const visitsWithAge = visits.map(v => ({
      ...v,
      student: {
        ...v.student,
        age:       computeAge(v.student.birthDate, v.student.age),
        birthDate: v.student.birthDate?.toISOString() ?? null,
      },
    }));

    return NextResponse.json({ visits: visitsWithAge });
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

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/courses/[id]/patient-records/[recordId]
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const { id: courseId, recordId } = await params;

    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const existing = await prisma.patientRecord.findUnique({
      where: { id: recordId },
      select: { courseId: true, recordedBy: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }
    if (existing.courseId !== courseId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const isHead  = access.courseRole?.includes("Head");
    const isOwner = existing.recordedBy === access.userId;
    if (!isHead && !isOwner) {
      return NextResponse.json({ error: "Not allowed to edit this record." }, { status: 403 });
    }

    const body = await req.json();
    const {
      complaint, temperature, bloodPressure, pulseRate,
      weight, diagnosis, medicine, action, notes, visitDate,
      medicineUsages,
    } = body as {
      complaint?: string; temperature?: number | null; bloodPressure?: string | null;
      pulseRate?: number | null; weight?: number | null; diagnosis?: string | null;
      medicine?: string | null; action?: string; notes?: string | null; visitDate?: string;
      medicineUsages?: { medicineId: string; quantityUsed: number }[];
    };

    const updated = await prisma.$transaction(async (tx) => {
      // Reconcile medicine stock only if medicineUsages was explicitly sent
      if (Array.isArray(medicineUsages)) {
        const oldUsages = await tx.medicineUsage.findMany({ where: { patientRecordId: recordId } });

        // Return old quantities back to stock
        for (const old of oldUsages) {
          if (old.medicineId) {
            await tx.medicineInventory.update({
              where: { id: old.medicineId },
              data:  { stockQty: { increment: old.quantityUsed } },
            }).catch(() => { /* medicine may have been deleted from inventory */ });
          }
        }
        await tx.medicineUsage.deleteMany({ where: { patientRecordId: recordId } });

        // Deduct new quantities and re-create usage rows
        if (medicineUsages.length > 0) {
          const meds = await tx.medicineInventory.findMany({
            where: { id: { in: medicineUsages.map(u => u.medicineId) } },
          });
          const medMap = new Map(meds.map(m => [m.id, m]));

          await tx.medicineUsage.createMany({
            data: medicineUsages.map(u => {
              const med = medMap.get(u.medicineId);
              return {
                patientRecordId: recordId,
                medicineId:      u.medicineId,
                medicineName:    med?.name ?? "Unknown",
                quantityUsed:    u.quantityUsed,
                unit:            med?.unit ?? "",
              };
            }),
          });

          for (const u of medicineUsages) {
            await tx.medicineInventory.update({
              where: { id: u.medicineId },
              data:  { stockQty: { decrement: u.quantityUsed } },
            }).catch(() => {});
          }
        }
      }

      return tx.patientRecord.update({
        where: { id: recordId },
        data: {
          complaint:     complaint?.trim(),
          temperature:   temperature   ?? null,
          bloodPressure: bloodPressure ?? null,
          pulseRate:     pulseRate     ?? null,
          weight:        weight        ?? null,
          diagnosis:     diagnosis?.trim()  || null,
          // Huwag i-wipe kung hindi naman pinasa ng client
          ...(medicine !== undefined ? { medicine: medicine?.trim() || null } : {}),
          action:        action as PatientAction | undefined,
          notes:         notes?.trim()      || null,
          visitDate:     visitDate ? new Date(visitDate) : undefined,
        },
        include: {
          student: {
            select: {
              id: true, studentNumber: true, name: true,
              email: true, address: true, birthDate: true,
              age: true, gender: true, course: true,
            },
          },
          recordedByUser: { select: { id: true, name: true } },
          medicineUsages: true,
        },
      });
    });

    const today = new Date();
    let computedAge = updated.student.age;
    if (updated.student.birthDate) {
      computedAge = today.getFullYear() - updated.student.birthDate.getFullYear();
      const m = today.getMonth() - updated.student.birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < updated.student.birthDate.getDate())) computedAge--;
    }

    return NextResponse.json({
      record: {
        ...updated,
        student: {
          ...updated.student,
          age:       computedAge,
          birthDate: updated.student.birthDate?.toISOString() ?? null,
        },
      },
    });
  } catch (err) {
    console.error("[PATCH /patient-records/[recordId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}