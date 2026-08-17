// src/app/api/courses/[id]/groupsets/[gsId]/groups/[gId]/members/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; gsId: string; gId: string; userId: string }> };

async function getCallerEnrollment(userId: string, courseId: string) {
  return prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
}

function canManage(courseRole: string): boolean {
  const roles = courseRole.split(",").map((r) => r.trim());
  return roles.includes("Head") || roles.includes("Staff");
}

/* ─────────────────────────────────────────────────────────────────
   DELETE /api/courses/[id]/groupsets/[gsId]/groups/[gId]/members/[userId]
   — Remove a member from a group
───────────────────────────────────────────────────────────────── */
export async function DELETE(
  _req: NextRequest,
  { params }: Params
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId, gsId, gId, userId } = await params;

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  if (!isAdmin) {
    const caller = await getCallerEnrollment(session.user.id, courseId);
    if (!caller || !canManage(caller.courseRole))
      return NextResponse.json({ error: "Only Head or Staff can remove members." }, { status: 403 });
  }

  // Check if member exists
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: gId } },
  });
  if (!member)
    return NextResponse.json({ error: "Member not found." }, { status: 404 });

  await prisma.groupMember.delete({
    where: { userId_groupId: { userId, groupId: gId } },
  });

  // Reassign leader if needed
  const groupSet = await prisma.groupSet.findUnique({
    where: { id: gsId },
    select: { autoAssignLeader: true, leaderType: true },
  });

  if (groupSet?.autoAssignLeader && member.isLeader) {
    const remaining = await prisma.groupMember.findMany({
      where: { groupId: gId },
      orderBy: { order: "asc" },
    });
    if (remaining.length > 0) {
      const newLeaderId =
        groupSet.leaderType === "random"
          ? remaining[Math.floor(Math.random() * remaining.length)].id
          : remaining[0].id;

      await prisma.groupMember.update({
        where: { id: newLeaderId },
        data: { isLeader: true },
      });
    }
  }

  return NextResponse.json({ success: true });
}