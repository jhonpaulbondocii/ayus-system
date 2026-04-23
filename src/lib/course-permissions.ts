// src/lib/course-permissions.ts

export const COURSE_ROLES = ["Staff", "Head"] as const;

export type CourseRole = (typeof COURSE_ROLES)[number];

export type CoursePermission =
  | "view_course"
  | "view_announcements"
  | "submit_assignments"
  | "manage_announcements"
  | "manage_assignments"
  | "manage_people"
  | "manage_course";

const COURSE_ROLE_PERMISSIONS: Record<CourseRole, CoursePermission[]> = {
  Staff: [
    "view_course",
    "view_announcements",
    "submit_assignments",
  ],
  Head: [
    "view_course",
    "view_announcements",
    "submit_assignments",
    "manage_announcements",
    "manage_assignments",
    "manage_people",
    "manage_course",
  ],
};

export function normalizeCourseRole(role: unknown): CourseRole {
  if (typeof role !== "string") return "Staff";

  const normalized = role.trim().toLowerCase();

  if (normalized === "head") return "Head";
  if (normalized === "staff") return "Staff";

  return "Staff";
}

export function isValidCourseRole(role: unknown): role is CourseRole {
  if (typeof role !== "string") return false;
  return COURSE_ROLES.includes(role as CourseRole);
}

export function hasCoursePermission(
  role: unknown,
  permission: CoursePermission
): boolean {
  const normalizedRole = normalizeCourseRole(role);
  return COURSE_ROLE_PERMISSIONS[normalizedRole].includes(permission);
}