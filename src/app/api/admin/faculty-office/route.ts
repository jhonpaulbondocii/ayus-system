// src/app/api/admin/faculty-office/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getOrCreateFacultyOffice,
  getFacultyOfficeMembers,
  changeFacultyOfficeRole,
  autoEnrollInFacultyOffice,
  bulkEnrollAllUsersInFacultyOffice,
} from "@/lib/faculty-office";
import { z } from "zod";

type SessionUser = { role?: string };

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const user = session.user as SessionUser;
  if (user?.role !== "ADMIN") return null;
  return session;
}

// ── GET — list all members of the Faculty office ─────────────────────────────
export async function GET() {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [office, members] = await Promise.all([
    getOrCreateFacultyOffice(),
    getFacultyOfficeMembers(),
  ]);

  return NextResponse.json({ office, members });
}

// ── POST — ensure the Faculty office exists (idempotent) ─────────────────────
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let userId: string | undefined;
  try {
    const body = await req.json();
    userId = body?.userId;
  } catch {
    // no body is fine
  }

  if (userId) {
    // Manually enroll a specific user
    await autoEnrollInFacultyOffice(userId);
    const office = await getOrCreateFacultyOffice();
    return NextResponse.json({
      message: "User enrolled in Faculty office.",
      officeId: office.id,
    });
  }

  // Bulk enroll all existing approved users into all Faculty offices
  const { enrolledCount } = await bulkEnrollAllUsersInFacultyOffice();
  const office = await getOrCreateFacultyOffice();
  return NextResponse.json({
    message: "Faculty office is ready.",
    office,
    enrolledCount,
  });
}

// ── PATCH — change a member's courseRole (ADMIN only) ────────────────────────
const PatchSchema = z.object({
  userId:  z.string().min(1, "userId is required"),
  newRole: z.string().min(1, "newRole is required"),
});

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { userId, newRole } = parsed.data;

  try {
    const enrollment = await changeFacultyOfficeRole(userId, newRole);
    return NextResponse.json({
      message: `Role updated to "${newRole}" successfully.`,
      enrollment,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}