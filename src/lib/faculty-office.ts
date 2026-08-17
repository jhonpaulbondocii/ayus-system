// src/lib/faculty-office.ts
//
// Central helper for the "Faculty" office.
// • Ensures the Faculty office (Course) exists — creates it once if missing.
// • Auto-enrolls any user into ALL Faculty-type offices.
// • Lets an admin change a member's courseRole inside that office.

import { prisma } from "@/lib/prisma";

// ─── constants ───────────────────────────────────────────────────────────────

export const FACULTY_OFFICE_CODE  = "OFFICE-FACULTY";
export const FACULTY_OFFICE_NAME  = "Faculty";
export const FACULTY_OFFICE_TYPE  = "FACULTY";
export const FACULTY_DEFAULT_ROLE = "Faculty";

// ─── ensure office exists ────────────────────────────────────────────────────

export async function getOrCreateFacultyOffice() {
  const existing = await prisma.course.findFirst({
    where: { code: FACULTY_OFFICE_CODE },
  });

  if (existing) return existing;

  return prisma.course.create({
    data: {
      name:        FACULTY_OFFICE_NAME,
      code:        FACULTY_OFFICE_CODE,
      color:       "#1d4ed8",
      status:      "UNPUBLISHED",
      officeType:  FACULTY_OFFICE_TYPE,
      description: "Auto-managed office for all faculty members.",
    },
  });
}

// ─── auto-enroll ─────────────────────────────────────────────────────────────

/**
 * Enrolls a user in ALL Faculty-type offices.
 * Silently skips if already enrolled.
 */
export async function autoEnrollInFacultyOffice(userId: string) {
  const facultyOffices = await prisma.course.findMany({
    where:  { officeType: "FACULTY" },
    select: { id: true },
  });

  if (facultyOffices.length === 0) return;

  await Promise.all(
    facultyOffices.map(office =>
      prisma.courseEnrollment.upsert({
        where: {
          userId_courseId: { userId, courseId: office.id },
        },
        update: {},
        create: {
          userId,
          courseId:   office.id,
          courseRole: FACULTY_DEFAULT_ROLE,
        },
      })
    )
  );
}

// ─── change role (admin only) ─────────────────────────────────────────────────

/**
 * Updates a member's courseRole inside a specific Faculty office.
 * The caller is responsible for verifying the acting user is an ADMIN.
 */
export async function changeFacultyOfficeRole(
  targetUserId: string,
  newRole: string,
  courseId?: string,
) {
  // If no courseId given, default to the canonical Faculty office
  const officeId = courseId ?? (await getOrCreateFacultyOffice()).id;

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: {
      userId_courseId: { userId: targetUserId, courseId: officeId },
    },
  });

  if (!enrollment) {
    throw new Error("User is not enrolled in the Faculty office.");
  }

  return prisma.courseEnrollment.update({
    where: {
      userId_courseId: { userId: targetUserId, courseId: officeId },
    },
    data: { courseRole: newRole },
  });
}

// ─── get all members ─────────────────────────────────────────────────────────

/**
 * Returns all enrollments in the Faculty office with basic user info.
 */
export async function getFacultyOfficeMembers(courseId?: string) {
  const officeId = courseId ?? (await getOrCreateFacultyOffice()).id;

  return prisma.courseEnrollment.findMany({
    where:   { courseId: officeId },
    include: {
      user: {
        select: {
          id:         true,
          name:       true,
          email:      true,
          image:      true,
          role:       true,
          status:     true,
          department: true,
          position:   true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

// ─── bulk enroll all existing users ──────────────────────────────────────────

/**
 * Enrolls ALL existing approved users into Faculty office(s).
 * - If courseId is given → enroll into that specific office only.
 * - If no courseId → enroll into ALL Faculty-type offices.
 * Safe to call multiple times — skips already-enrolled users.
 */
export async function bulkEnrollAllUsersInFacultyOffice(courseId?: string) {
  const facultyOffices = courseId
    ? [{ id: courseId }]
    : await prisma.course.findMany({
        where:  { officeType: "FACULTY" },
        select: { id: true },
      });

  if (facultyOffices.length === 0) return { enrolledCount: 0 };

  const users = await prisma.user.findMany({
    where:  { status: "APPROVED" },
    select: { id: true },
  });

  for (const office of facultyOffices) {
    await Promise.all(
      users.map(user =>
        prisma.courseEnrollment.upsert({
          where: {
            userId_courseId: { userId: user.id, courseId: office.id },
          },
          update: {},
          create: {
            userId:     user.id,
            courseId:   office.id,
            courseRole: FACULTY_DEFAULT_ROLE,
          },
        })
      )
    );
  }

  return { enrolledCount: users.length };
}