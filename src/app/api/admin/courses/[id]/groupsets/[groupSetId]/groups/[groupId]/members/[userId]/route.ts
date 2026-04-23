// src/app/api/admin/courses/[id]/groupsets/[groupSetId]/groups/[groupId]/members/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SessionUser = { role?: string };

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  if ((session.user as SessionUser)?.role !== "ADMIN") return null;
  return session;
}

// DELETE — remove a member from a group
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; groupSetId: string; groupId: string; userId: string }> }
) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId, userId } = await params;

  await prisma.groupMember.delete({
    where: { userId_groupId: { userId, groupId } },
  });

  return NextResponse.json({ success: true });
}