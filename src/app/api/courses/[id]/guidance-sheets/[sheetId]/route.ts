// src/app/api/courses/[id]/guidance-sheets/[sheetId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

// GET — fetch one sheet (full detail)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sheetId: string }> }
) {
  try {
    const { id: courseId, sheetId } = await params;

    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const sheet = await prisma.guidanceInfoSheet.findUnique({
      where: { id: sheetId },
    });

    if (!sheet || sheet.courseId !== courseId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ sheet });

  } catch (err) {
    console.error("[GET /guidance-sheets/[sheetId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH — allow resubmit or change status (Head only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sheetId: string }> }
) {
  try {
    const { id: courseId, sheetId } = await params;

    const access = await requireCoursePermission(courseId, "manage_course");
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

    const body = await req.json() as {
      allowResubmit?: boolean;
      status?:        string;
    };

    const sheet = await prisma.guidanceInfoSheet.update({
      where: { id: sheetId },
      data: {
        ...(body.allowResubmit !== undefined ? { allowResubmit: body.allowResubmit } : {}),
        ...(body.status        !== undefined ? { status: body.status }               : {}),
      },
    });

    return NextResponse.json({ sheet });

  } catch (err) {
    console.error("[PATCH /guidance-sheets/[sheetId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — Head only
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sheetId: string }> }
) {
  try {
    const { id: courseId, sheetId } = await params;

    const access = await requireCoursePermission(courseId, "manage_course");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const sheet = await prisma.guidanceInfoSheet.findUnique({
      where:  { id: sheetId },
      select: { courseId: true },
    });

    if (!sheet || sheet.courseId !== courseId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.guidanceInfoSheet.delete({ where: { id: sheetId } });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[DELETE /guidance-sheets/[sheetId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}