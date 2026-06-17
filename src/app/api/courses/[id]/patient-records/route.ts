// src/app/api/courses/[id]/patient-records/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";
import { PatientAction } from "@/generated/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/courses/[id]/patient-records
// Returns all patient records for this clinic office, grouped by date
// ─────────────────────────────────────────────────────────────────────────────
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

    // Verify clinic office
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { officeType: true },
    });

    if (course?.officeType !== "CLINIC") {
      return NextResponse.json({ error: "Not a clinic office" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search   = searchParams.get("search")?.trim()   ?? "";
    const status   = searchParams.get("status")?.trim()   ?? "";
    const dateFrom = searchParams.get("dateFrom")?.trim() ?? "";
    const dateTo   = searchParams.get("dateTo")?.trim()   ?? "";

    const records = await prisma.patientRecord.findMany({
      where: {
        courseId,
        ...(status ? { action: status as PatientAction } : {}),
        ...(dateFrom || dateTo
          ? {
              visitDate: {
                ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
                ...(dateTo   ? { lte: new Date(`${dateTo}T23:59:59.999Z`)   } : {}),
              },
            }
          : {}),
        ...(search
          ? {
              OR: [
                { complaint: { contains: search, mode: "insensitive" } },
                { student: { name:          { contains: search, mode: "insensitive" } } },
                { student: { studentNumber: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
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
        // ── NEW: include medicine usages ──
        medicineUsages: {
          select: {
            id:           true,
            medicineId:   true,
            medicineName: true,
            quantityUsed: true,
            unit:         true,
          },
        },
      },
      orderBy: { visitDate: "desc" },
    });

    return NextResponse.json({ records });
  } catch (err) {
    console.error("[GET /patient-records]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/courses/[id]/patient-records
// Add a new patient visit record (with optional medicine usages)
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (access.systemRole === "ADMIN") {
      return NextResponse.json(
        { error: "Admins can view but not manage patient records" },
        { status: 403 }
      );
    }

    // Verify clinic office
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { officeType: true },
    });

    if (course?.officeType !== "CLINIC") {
      return NextResponse.json({ error: "Not a clinic office" }, { status: 403 });
    }

    const body = await req.json() as {
      studentId:      string;
      complaint:      string;
      temperature?:   number | null;
      bloodPressure?: string | null;
      pulseRate?:     number | null;
      weight?:        number | null;
      diagnosis?:     string | null;
      medicine?:      string | null;
      action:         string;
      notes?:         string | null;
      visitDate:      string;
      // ── NEW ──
      medicineUsages?: {
        medicineId:   string;
        quantityUsed: number;
      }[];
    };

    // ── Validate required fields ──────────────────────────────────────────────
    if (!body.studentId?.trim()) {
      return NextResponse.json({ error: "Student is required" }, { status: 400 });
    }
    if (!body.complaint?.trim()) {
      return NextResponse.json({ error: "Chief complaint is required" }, { status: 400 });
    }
    if (!body.action?.trim()) {
      return NextResponse.json({ error: "Action taken is required" }, { status: 400 });
    }
    if (!body.visitDate) {
      return NextResponse.json({ error: "Visit date is required" }, { status: 400 });
    }

    // ── Validate medicine usages if provided ──────────────────────────────────
    const medicineUsages = body.medicineUsages ?? [];

    for (const usage of medicineUsages) {
      if (!usage.medicineId?.trim()) {
        return NextResponse.json({ error: "Invalid medicine in usages" }, { status: 400 });
      }
      if (!usage.quantityUsed || usage.quantityUsed <= 0) {
        return NextResponse.json(
          { error: "Quantity used must be greater than 0" },
          { status: 400 }
        );
      }
    }

    // ── Verify student exists ─────────────────────────────────────────────────
    const student = await prisma.student.findUnique({
      where: { id: body.studentId },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // ── Fetch medicines for snapshot + stock check ────────────────────────────
    let medicineSnapshots: {
      id:           string;
      name:         string;
      unit:         string;
      stockQty:     number;
      quantityUsed: number;
    }[] = [];

    if (medicineUsages.length > 0) {
      const medicineIds = medicineUsages.map((u) => u.medicineId);

      const medicines = await prisma.medicineInventory.findMany({
        where: {
          id:       { in: medicineIds },
          courseId,                       // ensure medicines belong to this clinic
        },
        select: { id: true, name: true, unit: true, stockQty: true },
      });

      // Make sure all requested medicines were found
      if (medicines.length !== medicineIds.length) {
        return NextResponse.json(
          { error: "One or more medicines not found in inventory" },
          { status: 404 }
        );
      }

      medicineSnapshots = medicines.map((med) => ({
        ...med,
        quantityUsed: medicineUsages.find((u) => u.medicineId === med.id)!.quantityUsed,
      }));
    }

    // ── Transaction: create record + usages + deduct stock ───────────────────
    const record = await prisma.$transaction(async (tx) => {
      // 1. Create the patient record
      const created = await tx.patientRecord.create({
        data: {
          courseId,
          studentId:     body.studentId,
          complaint:     body.complaint.trim(),
          temperature:   body.temperature   ?? null,
          bloodPressure: body.bloodPressure?.trim() ?? null,
          pulseRate:     body.pulseRate     ?? null,
          weight:        body.weight        ?? null,
          diagnosis:     body.diagnosis?.trim()  ?? null,
          medicine:      body.medicine?.trim()   ?? null,
          action:        body.action as PatientAction,
          notes:         body.notes?.trim()      ?? null,
          visitDate:     new Date(body.visitDate),
          recordedBy:    access.userId,
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
      });

      // 2. Create MedicineUsage records + deduct stock
      if (medicineSnapshots.length > 0) {
        await tx.medicineUsage.createMany({
          data: medicineSnapshots.map((med) => ({
            patientRecordId: created.id,
            medicineId:      med.id,
            medicineName:    med.name,      // snapshot
            quantityUsed:    med.quantityUsed,
            unit:            med.unit,      // snapshot
          })),
        });

        // Deduct stock for each medicine (allow going negative — clinic flexibility)
        for (const med of medicineSnapshots) {
          await tx.medicineInventory.update({
            where: { id: med.id },
            data:  { stockQty: { decrement: med.quantityUsed } },
          });
        }
      }

      return created;
    });

    // ── Fetch medicine usages to include in response ──────────────────────────
    const usages = await prisma.medicineUsage.findMany({
      where: { patientRecordId: record.id },
      select: {
        id:           true,
        medicineId:   true,
        medicineName: true,
        quantityUsed: true,
        unit:         true,
      },
    });

    return NextResponse.json(
      { record: { ...record, medicineUsages: usages } },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /patient-records]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}