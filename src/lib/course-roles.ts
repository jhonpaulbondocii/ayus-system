// src/lib/course-roles.ts
// Shared multi-role utilities — used by API routes and frontend helpers

export const AVAILABLE_COURSE_ROLES = ["Staff", "Head"] as const;
export type CourseRole = (typeof AVAILABLE_COURSE_ROLES)[number];

/**
 * Parse a raw courseRole string (e.g. "Staff", "Head", "Staff,Head") into an array.
 * Always returns at least ["Staff"] as fallback.
 */
export function parseRoles(raw: string | null | undefined): CourseRole[] {
  if (!raw) return ["Staff"];
  const parts = raw
    .split(",")
    .map((r) => r.trim())
    .filter((r): r is CourseRole =>
      AVAILABLE_COURSE_ROLES.includes(r as CourseRole)
    );
  return parts.length > 0 ? parts : ["Staff"];
}

/**
 * Serialize an array of roles back to a DB string.
 * e.g. ["Staff","Head"] → "Staff,Head"
 */
export function serializeRoles(roles: CourseRole[]): string {
  const unique = [...new Set(roles)].filter((r) =>
    AVAILABLE_COURSE_ROLES.includes(r)
  );
  return unique.length > 0 ? unique.join(",") : "Staff";
}

/** True if the role string includes "Staff" */
export function hasStaff(raw: string | null | undefined): boolean {
  return parseRoles(raw).includes("Staff");
}

/** True if the role string includes "Head" */
export function hasHead(raw: string | null | undefined): boolean {
  return parseRoles(raw).includes("Head");
}

/**
 * Human-readable label for a role string.
 * e.g. "Staff,Head" → "Staff · Head"
 */
export function roleLabel(raw: string | null | undefined): string {
  return parseRoles(raw).join(" · ");
}

/**
 * Badge color config per role.
 */
export const ROLE_BADGE: Record<CourseRole, { bg: string; color: string }> = {
  Staff: { bg: "#eff6ff", color: "#1d4ed8" },
  Head:  { bg: "#fef2f2", color: "#7b1113" },
};