// src/app/api/courses/[id]/body-systems/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/courses/[id]/body-systems
// Returns all body systems for this clinic course, each with its conditions
// ─────────────────────────────────────────────────────────────────────────────
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
      where: { id: courseId },
      select: { officeType: true },
    });

    if (course?.officeType !== "CLINIC") {
      return NextResponse.json({ error: "Not a clinic office" }, { status: 403 });
    }

    const bodySystems = await prisma.bodySystem.findMany({
      where: { courseId },
      select: {
        id:    true,
        name:  true,
        order: true,
        conditions: {
          select: { id: true, name: true, order: true },
          orderBy: [{ order: "asc" }, { name: "asc" }],
        },
      },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ bodySystems });
  } catch (err) {
    console.error("[GET /body-systems]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/courses/[id]/body-systems
// Create a new body system (e.g. "Alimentary System")
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

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

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { officeType: true },
    });

    if (course?.officeType !== "CLINIC") {
      return NextResponse.json({ error: "Not a clinic office" }, { status: 403 });
    }

    const body = (await req.json()) as { name: string };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Body system name is required" }, { status: 400 });
    }

    const count = await prisma.bodySystem.count({ where: { courseId } });

    const bodySystem = await prisma.bodySystem.create({
      data: {
        courseId,
        name:  body.name.trim(),
        order: count,
      },
      select: {
        id:    true,
        name:  true,
        order: true,
        conditions: { select: { id: true, name: true, order: true } },
      },
    });

    return NextResponse.json({ bodySystem }, { status: 201 });
  } catch (err) {
    console.error("[POST /body-systems]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}