// src/app/api/admin/courses/[id]/groupsets/[groupSetId]/groups/[groupId]/members/route.ts
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

// POST — add a member to a group, with auto-leader logic
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; groupSetId: string; groupId: string }> }
) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupSetId, groupId } = await params;
  const { userId } = await req.json();

  if (!userId)
    return NextResponse.json({ error: "userId required" }, { status: 400 });

  // Check if already a member
  const existing = await prisma.groupMember.findFirst({
    where: { groupId, userId },
  });
  if (existing)
    return NextResponse.json({ error: "Already a member" }, { status: 409 });

  // Fetch the GroupSet to check autoAssignLeader + leaderType
  const groupSet = await prisma.groupSet.findUnique({
    where: { id: groupSetId },
    select: { autoAssignLeader: true, leaderType: true },
  });

  // Count existing members in this group
  const memberCount = await prisma.groupMember.count({ where: { groupId } });

  // Determine if this new member should be leader
  let isLeader = false;
  if (groupSet?.autoAssignLeader) {
    if (groupSet.leaderType === "first" && memberCount === 0) {
      // First student to join → leader
      isLeader = true;
    } else if (groupSet.leaderType === "random") {
      // Random: assign as leader, then randomly pick among all members after insert
      // We'll handle this below after creation
      isLeader = false;
    }
  }

  // Create the member
  const member = await prisma.groupMember.create({
    data: { userId, groupId, isLeader },
  });

  // For "random" leader type: randomly reassign leader among all members
  if (groupSet?.autoAssignLeader && groupSet.leaderType === "random") {
    const allMembers = await prisma.groupMember.findMany({ where: { groupId } });
    if (allMembers.length > 0) {
      // Clear all leaders first
      await prisma.groupMember.updateMany({
        where: { groupId },
        data: { isLeader: false },
      });
      // Pick random leader
      const randomIndex = Math.floor(Math.random() * allMembers.length);
      await prisma.groupMember.update({
        where: { id: allMembers[randomIndex].id },
        data: { isLeader: true },
      });
    }
  }

  return NextResponse.json({ member });
}

// DELETE — remove a member from a group
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; groupSetId: string; groupId: string }> }
) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupSetId, groupId } = await params;
  const { userId } = await req.json();

  if (!userId)
    return NextResponse.json({ error: "userId required" }, { status: 400 });

  await prisma.groupMember.deleteMany({ where: { groupId, userId } });

  // If leaderType is "first" or "random" and autoAssignLeader is on,
  // reassign leader to remaining members if the removed user was leader
  const groupSet = await prisma.groupSet.findUnique({
    where: { id: groupSetId },
    select: { autoAssignLeader: true, leaderType: true },
  });

  if (groupSet?.autoAssignLeader) {
    const remainingMembers = await prisma.groupMember.findMany({ where: { groupId } });
    const hasLeader = remainingMembers.some(m => m.isLeader);

    if (!hasLeader && remainingMembers.length > 0) {
      if (groupSet.leaderType === "first") {
        // Assign the first remaining member as leader
        await prisma.groupMember.update({
          where: { id: remainingMembers[0].id },
          data: { isLeader: true },
        });
      } else if (groupSet.leaderType === "random") {
        // Pick a random remaining member
        const randomIndex = Math.floor(Math.random() * remainingMembers.length);
        await prisma.groupMember.update({
          where: { id: remainingMembers[randomIndex].id },
          data: { isLeader: true },
        });
      }
    }
  }

  return NextResponse.json({ success: true });
}