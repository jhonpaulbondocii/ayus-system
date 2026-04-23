// src/app/api/admin/courses/[id]/people/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  normalizeCourseRole,
  COURSE_ROLES,
} from "@/lib/course-permissions";
import { requireCoursePermission } from "@/lib/course-access";

type SessionUser = { role?: string };

// GET — list all enrolled people in a course
// Allowed: any authenticated enrolled user OR ADMIN
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: courseId } = await params;

  const access = await requireCoursePermission(courseId, "view_course");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          pronouns: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const people = enrollments.map((e) => ({
    id: e.user.id,
    name: e.user.name ?? "",
    email: e.user.email ?? "",
    image: e.user.image ?? null,
    pronouns: e.user.pronouns ?? null,
    role: normalizeCourseRole(e.courseRole),
    enrolledAt: e.createdAt.toISOString(),
  }));

  return NextResponse.json({
    people,
    availableRoles: COURSE_ROLES,
    viewer: {
      systemRole: (session.user as SessionUser)?.role ?? "",
      courseRole: access.ok ? access.courseRole : null,
      canManagePeople: access.ok
        ? access.systemRole === "ADMIN" || access.courseRole === "Head"
        : false,
    },
  });
}

// POST — enroll a user in a course with a specific role
// Allowed: ADMIN or Head
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;

  const access = await requireCoursePermission(courseId, "manage_people");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await req.json();
  const { email, userId, role } = body;

  const enrollmentRole = normalizeCourseRole(role);

  let user: { id: string } | null = null;

  if (userId) {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
  } else if (email) {
    user = await prisma.user.findUnique({
      where: { email: email.trim() },
      select: { id: true },
    });
  }

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existing = await prisma.courseEnrollment.findUnique({
    where: {
      userId_courseId: {
        userId: user.id,
        courseId,
      },
    },
  });

  if (existing) {
    const updated = await prisma.courseEnrollment.update({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId,
        },
      },
      data: {
        courseRole: enrollmentRole,
      },
    });

    return NextResponse.json({
      enrollment: {
        ...updated,
        courseRole: normalizeCourseRole(updated.courseRole),
      },
      updated: true,
    });
  }

  const enrollment = await prisma.courseEnrollment.create({
    data: {
      userId: user.id,
      courseId,
      courseRole: enrollmentRole,
    },
  });

  return NextResponse.json({
    enrollment: {
      ...enrollment,
      courseRole: normalizeCourseRole(enrollment.courseRole),
    },
  });
}

// DELETE — remove a user from a course
// Allowed: ADMIN or Head
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;

  const access = await requireCoursePermission(courseId, "manage_people");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  await prisma.courseEnrollment.deleteMany({
    where: { userId, courseId },
  });

  return NextResponse.json({ success: true });
}