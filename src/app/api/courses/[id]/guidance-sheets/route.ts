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
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    // ── No auth check here — public form submission ──────────────────────────
    // Verify the course exists and is a GUIDANCE office
    const course = await prisma.course.findUnique({
      where:  { id: courseId },
      select: { officeType: true },
    });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    if (course.officeType !== "GUIDANCE") {
      return NextResponse.json({ error: "Not a guidance office" }, { status: 403 });
    }

    const body = await req.json();

    // ── Required fields ──────────────────────────────────────────────────────
    if (!body.studentNo?.trim()) {
      return NextResponse.json({ error: "Student number is required." }, { status: 400 });
    }
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    // ── Check for duplicate (same courseId + studentNo) ──────────────────────
    const existing = await prisma.guidanceInfoSheet.findUnique({
      where: { courseId_studentNo: { courseId, studentNo: body.studentNo.trim() } },
    });

    // If allowResubmit is false and a record exists, block the submission
    if (existing && !existing.allowResubmit) {
      return NextResponse.json(
        { error: "You have already submitted an information sheet for this course." },
        { status: 409 }
      );
    }

    // ── Upsert the guidance sheet ────────────────────────────────────────────
    const sheetData = {
      courseProgram:        body.courseProgram        ?? null,
      yearSection:          body.yearSection          ?? null,
      name:                 body.name.trim(),
      nickname:             body.nickname             ?? null,
      age:                  body.age != null ? Number(body.age) : null,
      dateOfBirth:          body.dateOfBirth          ?? null,
      placeOfBirth:         body.placeOfBirth         ?? null,
      birthOrder:           body.birthOrder           ?? null,
      mobileNo:             body.mobileNo             ?? null,
      email:                body.email                ?? null,
      sex:                  body.sex                  ?? null,
      religion:             body.religion             ?? null,
      completeAddress:      body.completeAddress      ?? null,
      fatherName:           body.fatherName           ?? null,
      fatherDOB:            body.fatherDOB            ?? null,
      fatherAddress:        body.fatherAddress        ?? null,
      fatherContact:        body.fatherContact        ?? null,
      fatherEduc:           body.fatherEduc           ?? null,
      fatherOccupation:     body.fatherOccupation     ?? null,
      fatherIncome:         body.fatherIncome         ?? null,
      fatherLanguage:       body.fatherLanguage       ?? null,
      fatherReligion:       body.fatherReligion        ?? null,
      fatherOFW:            body.fatherOFW            ?? null,
      fatherYearsAbroad:    body.fatherYearsAbroad    ?? null,
      motherName:           body.motherName           ?? null,
      motherDOB:            body.motherDOB            ?? null,
      motherAddress:        body.motherAddress        ?? null,
      motherContact:        body.motherContact        ?? null,
      motherEduc:           body.motherEduc           ?? null,
      motherOccupation:     body.motherOccupation     ?? null,
      motherIncome:         body.motherIncome         ?? null,
      motherLanguage:       body.motherLanguage       ?? null,
      motherReligion:       body.motherReligion       ?? null,
      motherOFW:            body.motherOFW            ?? null,
      motherYearsAbroad:    body.motherYearsAbroad    ?? null,
      maritalStatus:        body.maritalStatus        ?? null,
      siblings:             body.siblings             ?? [],
      guardianName:         body.guardianName         ?? null,
      guardianContact:      body.guardianContact      ?? null,
      guardianAddress:      body.guardianAddress      ?? null,
      emergencyPerson:      body.emergencyPerson      ?? null,
      emergencyContact:     body.emergencyContact     ?? null,
      educBackground:       body.educBackground       ?? {},
      awards:               body.awards               ?? null,
      organizations:        body.organizations        ?? [],
      interests:            body.interests            ?? null,
      talents:              body.talents              ?? null,
      hobbies:              body.hobbies              ?? null,
      goals:                body.goals                ?? null,
      principles:           body.principles           ?? null,
      characteristics:      body.characteristics      ?? null,
      fears:                body.fears                ?? null,
      healthAcademics:      body.healthAcademics      ?? null,
      healthExtracurricular:body.healthExtracurricular ?? null,
      psychiatricHelp:      body.psychiatricHelp      ?? null,
      counseling:           body.counseling           ?? null,
      photoUrl:             body.photoUrl             ?? null,
      signatureUrl:         body.signatureUrl         ?? null,
      signedAt:             body.signedAt ? new Date(body.signedAt) : null,
      status:               "SUBMITTED",
      allowResubmit:        false,
      submittedAt:          new Date(),
    };

    const sheet = existing
      ? await prisma.guidanceInfoSheet.update({
          where: { id: existing.id },
          data:  { ...sheetData, allowResubmit: false },
        })
      : await prisma.guidanceInfoSheet.create({
          data: { courseId, studentNo: body.studentNo.trim(), ...sheetData },
        });

    // ── Auto-sync to Student Records (skip if studentNumber already exists) ──
    try {
      await prisma.student.upsert({
        where:  { studentNumber: body.studentNo.trim() },
        update: {},   // already exists → do nothing
        create: {
          studentNumber: body.studentNo.trim(),
          name:          body.name.trim(),
          email:         body.email          ?? null,
          address:       body.completeAddress ?? null,
          birthDate:     body.dateOfBirth
                           ? new Date(body.dateOfBirth) : null,
          gender:        body.sex            ?? null,
          course:        body.courseProgram  ?? null,
          age:           body.age != null ? Number(body.age) : null,
        },
      });
    } catch (syncErr) {
      // Non-fatal — guidance sheet was saved, just log the sync failure
      console.error("[POST /guidance-sheets] Student sync failed:", syncErr);
    }

    return NextResponse.json({ sheet }, { status: existing ? 200 : 201 });

  } catch (err) {
    console.error("[POST /guidance-sheets]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}