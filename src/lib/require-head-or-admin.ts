import { requireCoursePermission } from "@/lib/course-access";

export async function requireHeadOrAdmin(courseId: string) {
  const access = await requireCoursePermission(courseId, "view_course");
  if (!access.ok) {
    return { ok: false as const, error: access.error, status: access.status };
  }

  const isAdmin = access.systemRole === "ADMIN";
  const isHead = (access.courseRole ?? "")
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .includes("head");

  if (!isAdmin && !isHead) {
    return { ok: false as const, error: "Forbidden", status: 403 };
  }

  return { ok: true as const, userId: access.userId };
}