// src/app/api/guidance/[courseId]/submit/route.ts
// PUBLIC — no auth required (students fill this out)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;

    // Verify this is a GUIDANCE office
    const course = await prisma.course.findUnique({
      where:  { id: courseId },
      select: { officeType: true, name: true, status: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Office not found" }, { status: 404 });
    }
    if (course.officeType !== "GUIDANCE") {
      return NextResponse.json({ error: "Not a guidance office" }, { status: 403 });
    }
    if (course.status !== "PUBLISHED") {
      return NextResponse.json({ error: "This form is not currently accepting submissions" }, { status: 403 });
    }

    const body = await req.json();

    // Validate required fields
    if (!body.studentNo?.trim()) {
      return NextResponse.json({ error: "Student number is required" }, { status: 400 });
    }
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const studentNo = body.studentNo.trim();

    // Check for existing submission
    const existing = await prisma.guidanceInfoSheet.findUnique({
      where: { courseId_studentNo: { courseId, studentNo } },
      select: { id: true, allowResubmit: true },
    });

    if (existing && !existing.allowResubmit) {
      return NextResponse.json({
        error: "A submission already exists for this student number. Please contact the Guidance Office if you need to update your information.",
        code:  "DUPLICATE",
      }, { status: 409 });
    }

    const data = {
      courseId,
      studentNo,
      courseProgram:    body.courseProgram?.trim()    || null,
      yearSection:      body.yearSection?.trim()      || null,
      name:             body.name.trim(),
      nickname:         body.nickname?.trim()         || null,
      age:              body.age ? parseInt(body.age) : null,
      dateOfBirth:      body.dateOfBirth?.trim()      || null,
      placeOfBirth:     body.placeOfBirth?.trim()     || null,
      birthOrder:       body.birthOrder?.trim()       || null,
      mobileNo:         body.mobileNo?.trim()         || null,
      email:            body.email?.trim()            || null,
      sex:              body.sex?.trim()              || null,
      religion:         body.religion?.trim()         || null,
      completeAddress:  body.completeAddress?.trim()  || null,
      fatherName:       body.fatherName?.trim()       || null,
      fatherDOB:        body.fatherDOB?.trim()        || null,
      fatherAddress:    body.fatherAddress?.trim()    || null,
      fatherContact:    body.fatherContact?.trim()    || null,
      fatherEduc:       body.fatherEduc?.trim()       || null,
      fatherOccupation: body.fatherOccupation?.trim() || null,
      fatherIncome:     body.fatherIncome?.trim()     || null,
      fatherLanguage:   body.fatherLanguage?.trim()   || null,
      fatherReligion:   body.fatherReligion?.trim()   || null,
      fatherOFW:        body.fatherOFW?.trim()        || null,
      fatherYearsAbroad:body.fatherYearsAbroad?.trim()|| null,
      motherName:       body.motherName?.trim()       || null,
      motherDOB:        body.motherDOB?.trim()        || null,
      motherAddress:    body.motherAddress?.trim()    || null,
      motherContact:    body.motherContact?.trim()    || null,
      motherEduc:       body.motherEduc?.trim()       || null,
      motherOccupation: body.motherOccupation?.trim() || null,
      motherIncome:     body.motherIncome?.trim()     || null,
      motherLanguage:   body.motherLanguage?.trim()   || null,
      motherReligion:   body.motherReligion?.trim()   || null,
      motherOFW:        body.motherOFW?.trim()        || null,
      motherYearsAbroad:body.motherYearsAbroad?.trim()|| null,
      maritalStatus:    body.maritalStatus?.trim()    || null,
      siblings:         body.siblings                 ?? [],
      guardianName:     body.guardianName?.trim()     || null,
      guardianContact:  body.guardianContact?.trim()  || null,
      guardianAddress:  body.guardianAddress?.trim()  || null,
      emergencyPerson:  body.emergencyPerson?.trim()  || null,
      emergencyContact: body.emergencyContact?.trim() || null,
      educBackground:   body.educBackground           ?? {},
      awards:           body.awards?.trim()           || null,
      organizations:    body.organizations            ?? [],
      interests:        body.interests?.trim()        || null,
      talents:          body.talents?.trim()          || null,
      hobbies:          body.hobbies?.trim()          || null,
      goals:            body.goals?.trim()            || null,
      principles:       body.principles?.trim()       || null,
      characteristics:  body.characteristics?.trim()  || null,
      fears:            body.fears?.trim()            || null,
      healthAcademics:       body.healthAcademics?.trim()       || null,
      healthExtracurricular: body.healthExtracurricular?.trim() || null,
      psychiatricHelp:       body.psychiatricHelp?.trim()       || null,
      counseling:            body.counseling?.trim()            || null,
      photoUrl:         body.photoUrl?.trim()         || null,
      signatureUrl:     body.signatureUrl?.trim()     || null,
      signedAt:         body.signatureUrl             ? new Date() : null,
      allowResubmit:    false,
      status:           "SUBMITTED",
    };

    let sheet;
    if (existing) {
      // Resubmit — update existing
      sheet = await prisma.guidanceInfoSheet.update({
        where: { courseId_studentNo: { courseId, studentNo } },
        data:  { ...data, allowResubmit: false },
      });
    } else {
      sheet = await prisma.guidanceInfoSheet.create({ data });
    }

    return NextResponse.json({ success: true, id: sheet.id }, { status: 201 });

  } catch (err) {
    console.error("[POST /guidance/submit]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET — check if student already submitted (by student number)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const studentNo = new URL(req.url).searchParams.get("studentNo")?.trim();

    if (!studentNo) {
      return NextResponse.json({ exists: false });
    }

    const existing = await prisma.guidanceInfoSheet.findUnique({
      where:  { courseId_studentNo: { courseId, studentNo } },
      select: { id: true, allowResubmit: true, name: true },
    });

    return NextResponse.json({
      exists:       !!existing,
      allowResubmit: existing?.allowResubmit ?? false,
      name:          existing?.name ?? null,
    });

  } catch (err) {
    console.error("[GET /guidance/submit]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}