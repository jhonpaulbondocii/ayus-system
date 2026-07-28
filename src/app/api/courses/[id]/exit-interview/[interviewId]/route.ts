// src/app/api/courses/[id]/exit-interviews/[interviewId]/route.ts
// PROTECTED — staff/head only

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; interviewId: string }> }
) {
  try {
    const { id: courseId, interviewId } = await params;
    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const interview = await prisma.exitInterview.findUnique({ where: { id: interviewId } });
    if (!interview || interview.courseId !== courseId)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ interview });
  } catch (err) {
    console.error("[GET /exit-interviews/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; interviewId: string }> }
) {
  try {
    const { id: courseId, interviewId } = await params;
    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const interview = await prisma.exitInterview.findUnique({ where: { id: interviewId } });
    if (!interview || interview.courseId !== courseId)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();

    // Build update payload — only accept known safe fields
    const data: Record<string, unknown> = {};
    if (body.status !== undefined)                data.status = body.status;
    if (body.counselorSignatureUrl !== undefined) {
      data.counselorSignatureUrl = body.counselorSignatureUrl;
      data.counselorSignedAt     = body.counselorSignatureUrl ? new Date() : null;
    }
    if (body.counselorName !== undefined)         data.counselorName = body.counselorName;

    const updated = await prisma.exitInterview.update({
      where: { id: interviewId },
      data,
    });

    return NextResponse.json({ interview: updated });
  } catch (err) {
    console.error("[PATCH /exit-interviews/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; interviewId: string }> }
) {
  try {
    const { id: courseId, interviewId } = await params;
    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const interview = await prisma.exitInterview.findUnique({ where: { id: interviewId } });
    if (!interview || interview.courseId !== courseId)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.exitInterview.delete({ where: { id: interviewId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /exit-interviews/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}