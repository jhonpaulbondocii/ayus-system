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

/** Parse a comma-separated role string into individual CourseRoles */
export function parseRoles(raw: unknown): CourseRole[] {
  if (typeof raw !== "string" || !raw.trim()) return ["Staff"];
  const parts = raw.split(",").map(r => r.trim());
  const valid = parts.filter((r): r is CourseRole =>
    COURSE_ROLES.includes(r as CourseRole)
  );
  return valid.length > 0 ? valid : ["Staff"];
}

/** Serialize roles array back to comma-separated string for DB storage */
export function serializeRoles(roles: CourseRole[]): string {
  const unique = [...new Set(roles)].filter(r => COURSE_ROLES.includes(r));
  return unique.length > 0 ? unique.join(",") : "Staff";
}

/** Legacy: normalize to a single role (used for display/fallback) */
export function normalizeCourseRole(raw: unknown): string {
  const roles = parseRoles(raw);
  return roles.join(",");
}

export function isValidCourseRole(role: unknown): role is CourseRole {
  if (typeof role !== "string") return false;
  return COURSE_ROLES.includes(role as CourseRole);
}

export function hasCoursePermission(
  role: unknown,
  permission: CoursePermission
): boolean {
  // Check permission across ALL assigned roles
  const roles = parseRoles(role);
  return roles.some(r => COURSE_ROLE_PERMISSIONS[r].includes(permission));
}