// src/app/api/courses/[id]/body-systems/[bodySystemId]/conditions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/courses/[id]/body-systems/[bodySystemId]/conditions
// Create a new medical condition (e.g. "Diarrhea") under a body system
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bodySystemId: string }> }
) {
  try {
    const { id: courseId, bodySystemId } = await params;

    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (access.systemRole === "ADMIN") {
      return NextResponse.json(
        { error: "Admins can view but not manage medical conditions" },
        { status: 403 }
      );
    }

    const bodySystem = await prisma.bodySystem.findUnique({ where: { id: bodySystemId } });
    if (!bodySystem || bodySystem.courseId !== courseId) {
      return NextResponse.json({ error: "Body system not found" }, { status: 404 });
    }

    const body = (await req.json()) as { name: string };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Condition name is required" }, { status: 400 });
    }

    const count = await prisma.medicalCondition.count({ where: { bodySystemId } });

    const condition = await prisma.medicalCondition.create({
      data: {
        courseId,
        bodySystemId,
        name:  body.name.trim(),
        order: count,
      },
      select: { id: true, name: true, order: true },
    });

    return NextResponse.json({ condition }, { status: 201 });
  } catch (err) {
    console.error("[POST /body-systems/:bodySystemId/conditions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}