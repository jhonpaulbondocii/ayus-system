// src/app/api/courses/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  normalizeCourseRole,
  hasCoursePermission,
} from "@/lib/course-permissions";

type Props = {
  params: Promise<{ id: string }>;
};

// GET — fetch one course for the logged-in user
export async function GET(_request: Request, { params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const enrollment = await prisma.courseEnrollment.findFirst({
    where: {
      userId: session.user.id,
      courseId: id,
    },
    include: {
      course: true,
    },
  });

  if (!enrollment?.course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const courseRole = normalizeCourseRole(enrollment.courseRole);

  const course = {
    id: enrollment.course.id,
    name: enrollment.course.name,
    code: enrollment.course.code,
    color: enrollment.course.color,
    status: enrollment.course.status,
    term: enrollment.course.term,
    startDate: enrollment.course.startDate,
    endDate: enrollment.course.endDate,
  };

  return NextResponse.json({
    course,
    membership: {
      role: courseRole,
      permissions: {
        viewCourse: hasCoursePermission(courseRole, "view_course"),
        viewAnnouncements: hasCoursePermission(courseRole, "view_announcements"),
        submitAssignments: hasCoursePermission(courseRole, "submit_assignments"),
        manageAnnouncements: hasCoursePermission(courseRole, "manage_announcements"),
        manageAssignments: hasCoursePermission(courseRole, "manage_assignments"),
        managePeople: hasCoursePermission(courseRole, "manage_people"),
        manageCourse: hasCoursePermission(courseRole, "manage_course"),
      },
    },
  });
}