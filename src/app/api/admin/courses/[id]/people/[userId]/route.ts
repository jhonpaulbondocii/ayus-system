// src/app/api/admin/courses/[id]/people/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";
import { parseRoles, serializeRoles } from "@/lib/course-roles";

type Params = { params: Promise<{ id: string; userId: string }> };

/**
 * PATCH /api/admin/courses/[id]/people/[userId]
 * Body: { roles?: string[]; courseId?: string } (courseId = new office/course to move to)
 *
 * - roles: e.g. ["Staff"], ["Head"], ["Staff","Head"]
 * - courseId: if provided, moves the enrollment to a different course (Change Office)
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: courseId, userId } = await params;

  const access = await requireCoursePermission(courseId, "manage_people");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await req.json();
  const { roles, courseId: newCourseId } = body as {
    roles?: string[];
    courseId?: string;
  };

  // ── Validate enrollment exists ──────────────────────────────────────────────
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  if (!enrollment) {
    return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });
  }

  // ── Change Office: move enrollment to a different course ────────────────────
  if (newCourseId && newCourseId !== courseId) {
    // Verify target course exists
    const targetCourse = await prisma.course.findUnique({
      where: { id: newCourseId },
      select: { id: true, name: true },
    });
    if (!targetCourse) {
      return NextResponse.json({ error: "Target course not found." }, { status: 404 });
    }

    // Check if already enrolled in target
    const alreadyInTarget = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId: newCourseId } },
    });
    if (alreadyInTarget) {
      return NextResponse.json(
        { error: "User is already enrolled in the target course." },
        { status: 409 }
      );
    }

    // Move: delete from current, create in new
    await prisma.$transaction([
      prisma.courseEnrollment.delete({
        where: { userId_courseId: { userId, courseId } },
      }),
      prisma.courseEnrollment.create({
        data: {
          userId,
          courseId: newCourseId,
          courseRole: enrollment.courseRole,
        },
      }),
    ]);

    return NextResponse.json({ success: true, movedTo: newCourseId });
  }

  // ── Edit Roles: update courseRole ───────────────────────────────────────────
  if (roles !== undefined) {
    const validRoles = parseRoles(roles.join(","));
    const serialized = serializeRoles(validRoles);

    const updated = await prisma.courseEnrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: { courseRole: serialized },
    });

    return NextResponse.json({ success: true, courseRole: updated.courseRole });
  }

  return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
}