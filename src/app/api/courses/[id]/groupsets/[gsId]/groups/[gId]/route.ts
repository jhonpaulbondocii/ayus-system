// src/app/api/courses/[id]/groupsets/[gsId]/groups/[gId]/route.ts
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
   PATCH /api/courses/[id]/groupsets/[gsId]/groups/[gId]
   — Edit group name / membership limit
───────────────────────────────────────────────────────────────── */
export async function PATCH(
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
      return NextResponse.json({ error: "Only Head or Staff can edit groups." }, { status: 403 });
  }

  // Verify group belongs to this group set and course
  const existing = await prisma.group.findFirst({
    where: { id: gId, groupSetId: gsId, courseId },
  });
  if (!existing)
    return NextResponse.json({ error: "Group not found." }, { status: 404 });

  const body = await req.json();
  const { name, membershipLimit } = body;

  if (name !== undefined && !name.trim())
    return NextResponse.json({ error: "Group name cannot be empty." }, { status: 400 });

  const group = await prisma.group.update({
    where: { id: gId },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, pronouns: true } },
        },
        orderBy: { order: "asc" },
      },
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json({ group });
}

/* ─────────────────────────────────────────────────────────────────
   DELETE /api/courses/[id]/groupsets/[gsId]/groups/[gId]
   — Delete a group and all its members
───────────────────────────────────────────────────────────────── */
export async function DELETE(
  _req: NextRequest,
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
      return NextResponse.json({ error: "Only Head or Staff can delete groups." }, { status: 403 });
  }

  const existing = await prisma.group.findFirst({
    where: { id: gId, groupSetId: gsId, courseId },
  });
  if (!existing)
    return NextResponse.json({ error: "Group not found." }, { status: 404 });

  await prisma.groupMember.deleteMany({ where: { groupId: gId } });
  await prisma.group.delete({ where: { id: gId } });

  return NextResponse.json({ success: true });
}