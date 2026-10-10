// src/server/osa/access.ts
// OSA access: Head/Admin = full, Staff = encode/edit, Faculty = walang access

import { NextResponse } from "next/server";
import { getCourseAccess } from "@/lib/course-access";

export type OsaAccess =
  | {
      ok: true;
      userId: string;
      isAdmin: boolean;
      isHead: boolean; // Head o Admin
      isStaff: boolean;
    }
  | { ok: false; response: NextResponse };

export async function requireOsaAccess(
  courseId: string,
  opts: { headOnly?: boolean } = {}
): Promise<OsaAccess> {
  const access = await getCourseAccess(courseId);

  if (!access.ok) {
    return {
      ok: false,
      response: NextResponse.json({ error: access.error }, { status: access.status }),
    };
  }

  const isAdmin = access.systemRole === "ADMIN";
  const roles = (access.courseRole ?? "").split(",").map((r) => r.trim());
  const isHead = isAdmin || roles.includes("Head");
  const isStaff = roles.includes("Staff");

  const allowed = opts.headOnly ? isHead : isHead || isStaff;

  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, userId: access.userId, isAdmin, isHead, isStaff };
}