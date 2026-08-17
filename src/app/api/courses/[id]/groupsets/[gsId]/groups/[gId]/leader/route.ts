// src/app/api/courses/[id]/groupsets/[gsId]/groups/[gId]/leader/route.ts
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
   PUT /api/courses/[id]/groupsets/[gsId]/groups/[gId]/leader
   Body: { userId: string }
   — Set a member as leader (clears previous leader first)
───────────────────────────────────────────────────────────────── */
export async function PUT(
  req: NextRequest,
  { params }: Params
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId, gId } = await params;

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  if (!isAdmin) {
    const caller = await getCallerEnrollment(session.user.id, courseId);
    if (!caller || !canManage(caller.courseRole))
      return NextResponse.json({ error: "Only Head or Staff can set leaders." }, { status: 403 });
  }

  const body = await req.json();
  const { userId } = body;

  if (!userId)
    return NextResponse.json({ error: "userId is required." }, { status: 400 });

  // Verify member is in this group
  const member = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId: gId } },
  });
  if (!member)
    return NextResponse.json({ error: "User is not a member of this group." }, { status: 404 });

  // Clear existing leader
  await prisma.groupMember.updateMany({
    where: { groupId: gId, isLeader: true },
    data: { isLeader: false },
  });

  // Set new leader
  await prisma.groupMember.update({
    where: { userId_groupId: { userId, groupId: gId } },
    data: { isLeader: true },
  });

  return NextResponse.json({ success: true });
}

/* ─────────────────────────────────────────────────────────────────
   DELETE /api/courses/[id]/groupsets/[gsId]/groups/[gId]/leader
   — Remove leader status from all members in this group
───────────────────────────────────────────────────────────────── */
export async function DELETE(
  _req: NextRequest,
  { params }: Params
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId, gId } = await params;

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  if (!isAdmin) {
    const caller = await getCallerEnrollment(session.user.id, courseId);
    if (!caller || !canManage(caller.courseRole))
      return NextResponse.json({ error: "Only Head or Staff can remove leaders." }, { status: 403 });
  }

  await prisma.groupMember.updateMany({
    where: { groupId: gId, isLeader: true },
    data: { isLeader: false },
  });

  return NextResponse.json({ success: true });
}