// src/app/api/courses/[id]/medical-exam-records/route.ts

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

    const { searchParams } = new URL(req.url);
    const search   = searchParams.get("search")   ?? "";
    const dateFrom = searchParams.get("dateFrom")  ?? "";
    const dateTo   = searchParams.get("dateTo")    ?? "";

    const records = await prisma.medicalExamRecord.findMany({
      where: {
        courseId,
        ...(dateFrom || dateTo ? {
          visitDate: {
            ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00+08:00`) } : {}),
            ...(dateTo   ? { lte: new Date(`${dateTo}T23:59:59+08:00`)   } : {}),
          },
        } : {}),
        ...(search ? {
          student: {
            OR: [
              { name:          { contains: search, mode: "insensitive" } },
              { studentNumber: { contains: search, mode: "insensitive" } },
            ],
          },
        } : {}),
      },
      include: {
        student: {
          select: {
            id:            true,
            studentNumber: true,
            name:          true,
            email:         true,
            address:       true,
            birthDate:     true,
            age:           true,
            gender:        true,
            course:        true,
          },
        },
        recordedByUser: { select: { id: true, name: true } },
      },
      orderBy: { visitDate: "desc" },
    });

    return NextResponse.json({ records });
  } catch (err) {
    console.error("[GET /medical-exam-records]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    const body = await req.json();
    const {
      studentId, purpose, visitDate,
      height, weight, heartRate, bloodPressure, temperature, respiratoryRate,
      placeOfBirth, section,
      physicalSigns,
      isPregnant, lastMenstrualPeriod, civilStatus,
      remarks,
      fitnessStatus, fitnessFor, clearanceRemarks,
    } = body;

    if (!studentId)       return NextResponse.json({ error: "Student is required."    }, { status: 400 });
    if (!purpose?.trim()) return NextResponse.json({ error: "Purpose is required."    }, { status: 400 });
    if (!visitDate)       return NextResponse.json({ error: "Visit date is required." }, { status: 400 });

    const record = await prisma.medicalExamRecord.create({
      data: {
        courseId,
        studentId,
        purpose:    purpose.trim(),
        visitDate:  new Date(visitDate),
        recordedBy: access.userId!,
        height:          height          ?? null,
        weight:          weight          ?? null,
        heartRate:       heartRate       ?? null,
        bloodPressure:   bloodPressure   ?? null,
        temperature:     temperature     ?? null,
        respiratoryRate: respiratoryRate ?? null,
        placeOfBirth:    placeOfBirth    ?? null,
        section:           section           ?? null,
        physicalSigns:   physicalSigns   ?? null,
        isPregnant:          isPregnant          ?? null,
        lastMenstrualPeriod: lastMenstrualPeriod ?? null,
        civilStatus:         civilStatus         ?? null,
        remarks:          remarks?.trim() || null,
        fitnessStatus:    fitnessStatus    ?? null,
        fitnessFor: Array.isArray(fitnessFor) ? fitnessFor : [],
        clearanceRemarks: clearanceRemarks ?? null,
        clearanceIssuedAt: fitnessStatus ? new Date() : null,
      },
      include: {
        student: {
          select: {
            id:            true,
            studentNumber: true,
            name:          true,
            email:         true,
            address:       true,
            birthDate:     true,
            age:           true,
            gender:        true,
            course:        true,
          },
        },
        recordedByUser: { select: { id: true, name: true } },
      },
    });

    // Auto-send signature request email if student has email
    if (record.student.email) {
      try {
        const crypto = await import("crypto");
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await prisma.medicalExamRecord.update({
          where: { id: record.id },
          data: {
            signToken:          token,
            signTokenExpiresAt: expiresAt,
            signEmailSentAt:    new Date(),
          },
        });

        const { sendMedExamSignatureRequestEmail } = await import("@/lib/email");
        await sendMedExamSignatureRequestEmail({
          to:        record.student.email,
          name:      record.student.name,
          visitDate: record.visitDate.toISOString(),
          purpose:   record.purpose,
          signToken: token,
        });
      } catch (emailErr) {
        console.error("[POST /medical-exam-records] email error:", emailErr);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ record }, { status: 201 });
  } catch (err) {
    console.error("[POST /medical-exam-records]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}