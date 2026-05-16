// src/lib/course-access.ts

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCoursePermission, parseRoles } from "@/lib/course-permissions";

type SessionUser = {
  id?: string;
  role?: string;
};

export type CourseAccessResult =
  | {
      ok: true;
      session: Awaited<ReturnType<typeof getServerSession>>;
      userId: string;
      systemRole: string;
      courseRole: string | null; // now supports "Staff", "Head", "Staff,Head"
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export async function getCourseAccess(
  courseId: string
): Promise<CourseAccessResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const sessionUser = session.user as SessionUser;
  const userId = sessionUser.id;
  const systemRole = sessionUser.role ?? "";

  if (!userId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  if (systemRole === "ADMIN") {
    return { ok: true, session, userId, systemRole, courseRole: null };
  }

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { courseRole: true },
  });

  if (!enrollment) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  // Preserve the raw value (e.g. "Staff", "Head", "Staff,Head")
  const roles = parseRoles(enrollment.courseRole);
  const courseRole = roles.join(",");

  return { ok: true, session, userId, systemRole, courseRole };
}

export async function requireCoursePermission(
  courseId: string,
  permission: Parameters<typeof hasCoursePermission>[1]
): Promise<CourseAccessResult> {
  const access = await getCourseAccess(courseId);

  if (!access.ok) return access;

  if (access.systemRole === "ADMIN") return access;

  if (!access.courseRole) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  // hasCoursePermission now handles comma-separated roles
  if (!hasCoursePermission(access.courseRole, permission)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return access;
}