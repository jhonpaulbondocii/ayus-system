// src/app/api/courses/[courseId]/library-facilities/_lib.ts
//
// ⚠️ Adjust these 2 imports to match your project
// (copy them from your library-cards/route.ts).
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type FacilityAuth =
  | { ok: false; status: number; error: string }
  | { ok: true; userId: string; isAdmin: boolean; isHead: boolean; canManage: boolean };

/** Admin = full access. Otherwise look at CourseEnrollment.courseRole ("Head" / "Staff" / "Faculty"). */
export async function authorize(courseId: string): Promise<FacilityAuth> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return { ok: false, status: 401, error: "Unauthorized" };

  const isAdmin = user.role === "ADMIN";
  if (isAdmin) return { ok: true, userId: user.id, isAdmin, isHead: true, canManage: true };

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    select: { courseRole: true },
  });
  if (!enrollment) return { ok: false, status: 403, error: "Forbidden" };

  const roles = enrollment.courseRole.split(",").map((r) => r.trim());
  const isHead = roles.includes("Head");
  const canManage = isHead || roles.includes("Staff");
  if (!canManage) return { ok: false, status: 403, error: "Forbidden" };

  return { ok: true, userId: user.id, isAdmin, isHead, canManage };
}

export const REQUESTOR_TYPES = ["STUDENT", "EMPLOYEE", "COMMUNITY"] as const;
export const FACILITY_TYPES = ["AUDIO_VISUAL", "DISCUSSION", "OTHER"] as const;

/** PSU-QSP-ULIB-003 rules (Sec. 4.2) + FO004 guidelines 3–5 */
export function checkRules(opts: {
  facilityType: string;
  participantCount: number;
  startAt: Date;
  endAt: Date;
}): string[] {
  const problems: string[] = [];
  const hours = (opts.endAt.getTime() - opts.startAt.getTime()) / 36e5;
  const isAV = opts.facilityType === "AUDIO_VISUAL";
  const [min, max] = isAV ? [50, 80] : [10, 20];

  if (opts.participantCount < min || opts.participantCount > max) {
    problems.push(
      `${isAV ? "Audio-Visual Room" : "Discussion Room / other facility"} requires ${min}–${max} participants (this request has ${opts.participantCount}).`,
    );
  }
  if (hours > 4) problems.push(`Maximum of 4 hours per requestor (this request is ${hours.toFixed(1)} hrs).`);
  if (isAV && hours < 2) problems.push(`Audio-Visual Room requires a minimum of 2 hours (this request is ${hours.toFixed(1)} hrs).`);
  return problems;
}