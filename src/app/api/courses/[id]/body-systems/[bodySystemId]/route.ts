// src/app/api/courses/[id]/body-systems/[bodySystemId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/courses/[id]/body-systems/[bodySystemId]
// Rename / reorder a body system
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(
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
        { error: "Admins can view but not manage body systems" },
        { status: 403 }
      );
    }

    const existing = await prisma.bodySystem.findUnique({ where: { id: bodySystemId } });
    if (!existing || existing.courseId !== courseId) {
      return NextResponse.json({ error: "Body system not found" }, { status: 404 });
    }

    const body = (await req.json()) as { name?: string; order?: number };

    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json({ error: "Body system name cannot be empty" }, { status: 400 });
    }

    const bodySystem = await prisma.bodySystem.update({
      where: { id: bodySystemId },
      data: {
        ...(body.name  !== undefined ? { name: body.name.trim() } : {}),
        ...(body.order !== undefined ? { order: body.order }     : {}),
      },
      select: {
        id:    true,
        name:  true,
        order: true,
        conditions: { select: { id: true, name: true, order: true } },
      },
    });

    return NextResponse.json({ bodySystem });
  } catch (err) {
    console.error("[PATCH /body-systems/:bodySystemId]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/courses/[id]/body-systems/[bodySystemId]
// Deletes the body system (and, via schema cascade, its conditions) — blocked
// if any patient record still references it or one of its conditions.
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(
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
        { error: "Admins can view but not manage body systems" },
        { status: 403 }
      );
    }

    const existing = await prisma.bodySystem.findUnique({ where: { id: bodySystemId } });
    if (!existing || existing.courseId !== courseId) {
      return NextResponse.json({ error: "Body system not found" }, { status: 404 });
    }

    const linkedCount = await prisma.patientRecord.count({
      where: { bodySystemId },
    });

    if (linkedCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${linkedCount} patient record(s) reference this body system. Reassign or remove those records first.`,
        },
        { status: 409 }
      );
    }

    await prisma.bodySystem.delete({ where: { id: bodySystemId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /body-systems/:bodySystemId]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}