// src/app/api/courses/[id]/groupsets/[gsId]/groups/[gId]/members/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; gsId: string; gId: string }> };

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
   POST /api/courses/[id]/groupsets/[gsId]/groups/[gId]/members
   — Add a member to a group
───────────────────────────────────────────────────────────────── */
export async function POST(
  req: NextRequest,
  { params }: Params
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId, gsId, gId } = await params;

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  if (!isAdmin) {
    const caller = await getCallerEnrollment(session.user.id, courseId);
    if (!caller || !canManage(caller.courseRole))
      return NextResponse.json({ error: "Only Head or Staff can add members." }, { status: 403 });
  }

  const body = await req.json();
  const { userId, placement } = body;

  if (!userId)
    return NextResponse.json({ error: "userId is required." }, { status: 400 });

  // Verify the user is enrolled in this course
  const enrollment = await getCallerEnrollment(userId, courseId);
  if (!enrollment)
    return NextResponse.json({ error: "User is not enrolled in this course." }, { status: 404 });

  // Check if already a member
  const existing = await prisma.groupMember.findFirst({
    where: { groupId: gId, userId },
  });
  if (existing)
    return NextResponse.json({ error: "Already a member of this group." }, { status: 409 });

  // Fetch group set settings
  const groupSet = await prisma.groupSet.findUnique({
    where: { id: gsId },
    select: { autoAssignLeader: true, leaderType: true },
  });

  const memberCount = await prisma.groupMember.count({ where: { groupId: gId } });

  // Determine leader status
  let isLeader = false;
  if (groupSet?.autoAssignLeader && groupSet.leaderType === "first" && memberCount === 0) {
    isLeader = true;
  }

  // Determine order based on placement
  let order = memberCount; // default: at the bottom
  if (placement === "At the Top") {
    order = 0;
    // Shift existing members down
    await prisma.groupMember.updateMany({
      where: { groupId: gId },
      data: { order: { increment: 1 } },
    });
  }

  const member = await prisma.groupMember.create({
    data: { userId, groupId: gId, isLeader, order },
  });

  // For "random" leader: reassign randomly among all members
  if (groupSet?.autoAssignLeader && groupSet.leaderType === "random") {
    const allMembers = await prisma.groupMember.findMany({ where: { groupId: gId } });
    if (allMembers.length > 0) {
      await prisma.groupMember.updateMany({
        where: { groupId: gId },
        data: { isLeader: false },
      });
      const randomIndex = Math.floor(Math.random() * allMembers.length);
      await prisma.groupMember.update({
        where: { id: allMembers[randomIndex].id },
        data: { isLeader: true },
      });
    }
  }

  return NextResponse.json({ member }, { status: 201 });
}