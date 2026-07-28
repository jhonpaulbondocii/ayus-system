import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const { searchParams } = new URL(req.url);
    const studentNo = searchParams.get("studentNo");
    const employeeNo = searchParams.get("employeeNo");

    if (studentNo) {
      const existing = await prisma.libraryCardRequest.findFirst({
        where: {
          courseId,
          studentNo,
          status: { notIn: ["RELEASED", "REJECTED"] },
        },
        select: { id: true, status: true },
      });
      return NextResponse.json({ exists: !!existing, status: existing?.status ?? null });
    }

    if (employeeNo) {
      const existing = await prisma.libraryCardRequest.findFirst({
        where: {
          courseId,
          employeeNo,
          status: { notIn: ["RELEASED", "REJECTED"] },
        },
        select: { id: true, status: true },
      });
      return NextResponse.json({ exists: !!existing, status: existing?.status ?? null });
    }

    return NextResponse.json({ exists: false });
  } catch (err) {
    console.error("[GET /library/submit]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

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
    if (!course || course.officeType !== "LIBRARY" || course.status !== "PUBLISHED")
      return NextResponse.json({ error: "This form is not currently accepting submissions." }, { status: 403 });

    const body = await req.json();
    const {
  requestType, applicantType, cardType, employeeType,
  name, sex, address, contactNo, email, reason,
  studentNo, courseProgram, yearSection,
  employeeNo, collegeDept, position,
  photoUrl, corIdUrl, affidavitUrl,
} = body;

    if (!name?.trim())
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!requestType)
      return NextResponse.json({ error: "Request type is required." }, { status: 400 });

    const request = await prisma.libraryCardRequest.create({
      data: {
        courseId,
        requestType,
        applicantType,
        cardType,
        employeeType: employeeType ?? null,
        name:         name.trim(),
        sex:          sex ?? null,
        address:      address ?? null,
        contactNo:    contactNo ?? null,
        email:        email ?? null,
        reason:       reason ?? null,
        studentNo:    studentNo ?? null,
        courseProgram:courseProgram ?? null,
        yearSection:  yearSection ?? null,
        employeeNo:   employeeNo ?? null,
        collegeDept:  collegeDept ?? null,
        position:     position ?? null,
        photoUrl:     photoUrl     ?? null,
        corIdUrl:     corIdUrl     ?? null,
        affidavitUrl: affidavitUrl ?? null,
        status:       "PENDING",
      },
    });

    return NextResponse.json({ success: true, requestId: request.id });
  } catch (err) {
    console.error("[POST /library/submit]", err);
    return NextResponse.json({ error: "Submission failed." }, { status: 500 });
  }
}