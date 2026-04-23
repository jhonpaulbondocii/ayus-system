// src/app/api/admin/courses/[id]/groupsets/[groupSetId]/groups/[groupId]/leader/route.ts
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

// PUT — set a member as leader (clears previous leader first)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; groupSetId: string; groupId: string }> }
) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  const { userId } = await req.json();

  if (!userId)
    return NextResponse.json({ error: "userId required" }, { status: 400 });

  // Clear any existing leader in this group
  await prisma.groupMember.updateMany({
    where: { groupId, isLeader: true },
    data:  { isLeader: false },
  });

  // Set the new leader
  await prisma.groupMember.update({
    where:  { userId_groupId: { userId, groupId } },
    data:   { isLeader: true },
  });

  return NextResponse.json({ success: true });
}

// DELETE — remove leader status (no one is leader)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; groupSetId: string; groupId: string }> }
) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;

  await prisma.groupMember.updateMany({
    where: { groupId, isLeader: true },
    data:  { isLeader: false },
  });

  return NextResponse.json({ success: true });
}