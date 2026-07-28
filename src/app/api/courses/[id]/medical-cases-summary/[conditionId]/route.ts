// src/app/api/courses/[id]/medical-conditions/[conditionId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/courses/[id]/medical-conditions/[conditionId]
// Rename / reorder a medical condition
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; conditionId: string }> }
) {
  try {
    const { id: courseId, conditionId } = await params;

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

    const existing = await prisma.medicalCondition.findUnique({ where: { id: conditionId } });
    if (!existing || existing.courseId !== courseId) {
      return NextResponse.json({ error: "Condition not found" }, { status: 404 });
    }

    const body = (await req.json()) as { name?: string; order?: number };

    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json({ error: "Condition name cannot be empty" }, { status: 400 });
    }

    const condition = await prisma.medicalCondition.update({
      where: { id: conditionId },
      data: {
        ...(body.name  !== undefined ? { name: body.name.trim() } : {}),
        ...(body.order !== undefined ? { order: body.order }     : {}),
      },
      select: { id: true, name: true, order: true },
    });

    return NextResponse.json({ condition });
  } catch (err) {
    console.error("[PATCH /medical-conditions/:conditionId]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/courses/[id]/medical-conditions/[conditionId]
// Blocked if any patient record still uses this condition
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; conditionId: string }> }
) {
  try {
    const { id: courseId, conditionId } = await params;

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

    const existing = await prisma.medicalCondition.findUnique({ where: { id: conditionId } });
    if (!existing || existing.courseId !== courseId) {
      return NextResponse.json({ error: "Condition not found" }, { status: 404 });
    }

    const linkedCount = await prisma.patientRecord.count({
      where: { medicalConditionId: conditionId },
    });

    if (linkedCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${linkedCount} patient record(s) use this condition. Reassign or remove those records first.`,
        },
        { status: 409 }
      );
    }

    await prisma.medicalCondition.delete({ where: { id: conditionId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /medical-conditions/:conditionId]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}