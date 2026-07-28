// src/app/api/exit-interview/[courseId]/submit/route.ts
// PUBLIC — no auth required

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;

    const course = await prisma.course.findUnique({
      where:  { id: courseId },
      select: { officeType: true, status: true },
    });

    if (!course)
      return NextResponse.json({ error: "Office not found" }, { status: 404 });
    if (course.officeType !== "GUIDANCE")
      return NextResponse.json({ error: "Not a guidance office" }, { status: 403 });
    if (course.status !== "PUBLISHED")
      return NextResponse.json({ error: "This form is not currently accepting submissions" }, { status: 403 });

    const body = await req.json();

    if (!body.lastName?.trim() || !body.firstName?.trim())
      return NextResponse.json({ error: "Last name and first name are required." }, { status: 400 });

    const record = await prisma.exitInterview.create({
      data: {
        courseId,
        lastName:       body.lastName.trim(),
        firstName:      body.firstName.trim(),
        middleName:     body.middleName?.trim()      || null,
        programSection: body.programSection?.trim()  || null,
        mobileNo:       body.mobileNo?.trim()        || null,
        graduationMonth:body.graduationMonth?.trim() || null,
        campus:         body.campus?.trim()          || null,
        homeAddress:    body.homeAddress?.trim()     || null,

        feelHappy:      !!body.feelHappy,
        feelExcited:    !!body.feelExcited,
        feelSad:        !!body.feelSad,
        feelNervous:    !!body.feelNervous,
        feelChallenged: !!body.feelChallenged,
        feelOthers:     body.feelOthers?.trim()      || null,

        influenceProfessor: !!body.influenceProfessor,
        influenceClassmate: !!body.influenceClassmate,
        influenceFriends:   !!body.influenceFriends,
        influenceFamily:    !!body.influenceFamily,
        influenceOthers:    body.influenceOthers?.trim() || null,

        planFindJob:     !!body.planFindJob,
        planGradStudies: !!body.planGradStudies,
        planBoardExam:   !!body.planBoardExam,
        planOthers:      !!body.planOthers,

        pressingProblemDetails: body.pressingProblemDetails ?? {},
        honorianValues:  body.honorianValues?.trim()  || null,
        likedMost:       body.likedMost?.trim()       || null,
        likedLeast:      body.likedLeast?.trim()      || null,
        recommend:       body.recommend?.trim()       || null,
        suggestions:     body.suggestions?.trim()     || null,

        studentSignatureUrl: body.studentSignatureUrl?.trim() || null,
        studentSignedAt:     body.studentSignatureUrl ? new Date() : null,
        status: "SUBMITTED",
      },
    });

    return NextResponse.json({ success: true, id: record.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /exit-interview/submit]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}