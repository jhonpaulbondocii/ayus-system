// src/app/api/admin/users/bulk/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SessionUser = { role?: string };

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const user = session.user as SessionUser;
  if (user?.role !== "ADMIN") return null;
  return session;
}

// DELETE /api/admin/users/bulk
// Body: { userIds: string[] }
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const userIds: string[] = body?.userIds ?? [];

  if (!userIds.length) {
    return NextResponse.json({ error: "userIds required" }, { status: 400 });
  }

  await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  return NextResponse.json({
    success: true,
    message: `${userIds.length} user(s) deleted successfully`,
  });
}