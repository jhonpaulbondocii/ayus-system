// src/app/api/admin/courses/[id]/groupsets/[groupSetId]/route.ts
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; groupSetId: string }> }
) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupSetId } = await params;
  const groupSet = await prisma.groupSet.findUnique({
    where: { id: groupSetId },
    include: {
      groups: {
        include: {
          members: { include: { user: { select: { id: true, name: true, pronouns: true } } } },
          _count: { select: { members: true } },
        },
      },
    },
  });

  if (!groupSet)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ groupSet });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; groupSetId: string }> }
) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupSetId } = await params;
  const body = await req.json();
  const { name, selfSignUp, requireSameSection, autoAssignLeader, leaderType, limitGroupMembers } = body;

  const groupSet = await prisma.groupSet.update({
    where: { id: groupSetId },
    data: {
      ...(name               !== undefined ? { name: name.trim() }  : {}),
      ...(selfSignUp         !== undefined ? { selfSignUp }         : {}),
      ...(requireSameSection !== undefined ? { requireSameSection } : {}),
      ...(autoAssignLeader   !== undefined ? { autoAssignLeader }   : {}),
      ...(leaderType         !== undefined ? { leaderType }         : {}),
      ...(limitGroupMembers  !== undefined ? { limitGroupMembers }  : {}),
    },
  });

  return NextResponse.json({ groupSet });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; groupSetId: string }> }
) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupSetId } = await params;

  // Delete all members, then groups, then groupSet
  const groups = await prisma.group.findMany({ where: { groupSetId } });
  for (const g of groups) {
    await prisma.groupMember.deleteMany({ where: { groupId: g.id } });
  }
  await prisma.group.deleteMany({ where: { groupSetId } });
  await prisma.groupSet.delete({ where: { id: groupSetId } });

  return NextResponse.json({ success: true });
}