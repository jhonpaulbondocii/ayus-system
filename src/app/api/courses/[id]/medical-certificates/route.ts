// src/app/api/courses/[id]/medical-certificates/route.ts

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
    const search   = searchParams.get("search")   ?? "";
    const dateFrom = searchParams.get("dateFrom") ?? "";
    const dateTo   = searchParams.get("dateTo")   ?? "";

    const records = await prisma.medicalCertificate.findMany({
      where: {
        courseId,
        ...(dateFrom || dateTo
          ? {
              visitDate: {
                ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00`) } : {}),
                ...(dateTo   ? { lte: new Date(`${dateTo}T23:59:59`)   } : {}),
              },
            }
          : {}),
        ...(search
          ? {
              student: {
                OR: [
                  { name:          { contains: search, mode: "insensitive" } },
                  { studentNumber: { contains: search, mode: "insensitive" } },
                ],
              },
            }
          : {}),
      },
      include: {
        student:        { select: { id: true, studentNumber: true, name: true, age: true, birthDate: true, gender: true, course: true, address: true } },
        recordedByUser: { select: { id: true, name: true } },
      },
      orderBy: { visitDate: "desc" },
    });

    return NextResponse.json({ records });
  } catch (err) {
    console.error("[GET /medical-certificates]", err);
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
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const body = await req.json();
    const { studentId, purpose, diagnosis, recommendation, ptrNumber, visitDate } = body;

    if (!studentId)     return NextResponse.json({ error: "studentId is required."     }, { status: 400 });
    if (!purpose?.trim()) return NextResponse.json({ error: "Purpose is required."     }, { status: 400 });
    if (!diagnosis?.trim()) return NextResponse.json({ error: "Diagnosis is required." }, { status: 400 });
    if (!visitDate)     return NextResponse.json({ error: "Visit date is required."    }, { status: 400 });

    const record = await prisma.medicalCertificate.create({
      data: {
        courseId,
        studentId,
        purpose:        purpose.trim(),
        diagnosis:      diagnosis.trim(),
        recommendation: (recommendation ?? "").trim(),
        ptrNumber:      ptrNumber?.trim() || null,
        visitDate:      new Date(visitDate),
        recordedBy:     access.userId ?? null,
      },
      include: {
        student:        { select: { id: true, studentNumber: true, name: true, age: true, birthDate: true, gender: true, course: true, address: true } },
        recordedByUser: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (err) {
    console.error("[POST /medical-certificates]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}