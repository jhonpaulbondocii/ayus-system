// src/app/api/courses/[id]/groupsets/[gsId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; gsId: string }> };

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
   PATCH /api/courses/[id]/groupsets/[gsId]
   — Edit group set settings
───────────────────────────────────────────────────────────────── */
export async function PATCH(
  req: NextRequest,
  { params }: Params
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId, gsId } = await params;

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  if (!isAdmin) {
    const caller = await getCallerEnrollment(session.user.id, courseId);
    if (!caller || !canManage(caller.courseRole))
      return NextResponse.json({ error: "Only Head or Staff can edit group sets." }, { status: 403 });
  }

  // Verify ownership
  const existing = await prisma.groupSet.findFirst({
    where: { id: gsId, courseId },
  });
  if (!existing)
    return NextResponse.json({ error: "Group set not found." }, { status: 404 });

  const body = await req.json();
  const {
    name, selfSignUp, requireSameSection,
    autoAssignLeader, leaderType, limitGroupMembers,
  } = body;

  const groupSet = await prisma.groupSet.update({
    where: { id: gsId },
    data: {
      ...(name               !== undefined ? { name: name.trim() }  : {}),
      ...(selfSignUp         !== undefined ? { selfSignUp }         : {}),
      ...(requireSameSection !== undefined ? { requireSameSection } : {}),
      ...(autoAssignLeader   !== undefined ? { autoAssignLeader }   : {}),
      ...(leaderType         !== undefined ? { leaderType }         : {}),
      ...(limitGroupMembers  !== undefined ? { limitGroupMembers }  : {}),
    },
    include: {
      groups: {
        select: {
          id: true,
          name: true,
          _count: { select: { members: true } },
          members: {
            select: {
              isLeader: true,
              order: true,
              user: { select: { id: true, name: true, pronouns: true } },
            },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  return NextResponse.json({ groupSet });
}

/* ─────────────────────────────────────────────────────────────────
   DELETE /api/courses/[id]/groupsets/[gsId]
   — Delete a specific group set
───────────────────────────────────────────────────────────────── */
export async function DELETE(
  _req: NextRequest,
  { params }: Params
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId, gsId } = await params;

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  if (!isAdmin) {
    const caller = await getCallerEnrollment(session.user.id, courseId);
    if (!caller || !canManage(caller.courseRole))
      return NextResponse.json({ error: "Only Head or Staff can delete group sets." }, { status: 403 });
  }

  const existing = await prisma.groupSet.findFirst({
    where: { id: gsId, courseId },
  });
  if (!existing)
    return NextResponse.json({ error: "Group set not found." }, { status: 404 });

  const groups = await prisma.group.findMany({ where: { groupSetId: gsId } });
  for (const g of groups) {
    await prisma.groupMember.deleteMany({ where: { groupId: g.id } });
  }
  await prisma.group.deleteMany({ where: { groupSetId: gsId } });
  await prisma.groupSet.delete({ where: { id: gsId } });

  return NextResponse.json({ success: true });
}