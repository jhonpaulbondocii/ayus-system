// src/app/api/admin/courses/[id]/groupsets/route.ts
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

const membersSelect = {
  select: {
    isLeader: true,
    order: true,
    user: { select: { id: true, name: true, pronouns: true } },
  },
  orderBy: { order: "asc" as const },
};

const groupsSelect = {
  select: {
    id: true,
    name: true,
    _count: { select: { members: true } },
    members: membersSelect,
  },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const groupSets = await prisma.groupSet.findMany({
    where: { courseId: id },
    include: { groups: groupsSelect },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ groupSets });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId } = await params;
  const body = await req.json();

  const {
    name, selfSignUp, requireSameSection, groupStructure,
    createGroupsNow, limitGroupMembers, autoAssignLeader, leaderType,
  } = body;

  if (!name?.trim())
    return NextResponse.json({ error: "Group Set Name is required" }, { status: 400 });

  const groupSet = await prisma.groupSet.create({
    data: {
      name:               name.trim(),
      courseId,
      selfSignUp:         selfSignUp         ?? false,
      requireSameSection: requireSameSection ?? false,
      groupStructure:     groupStructure     ?? "Create groups later",
      createGroupsNow:    createGroupsNow    ?? 0,
      limitGroupMembers:  limitGroupMembers  ?? 0,
      autoAssignLeader:   autoAssignLeader   ?? false,
      leaderType:         leaderType         ?? "first",
    },
  });

  const numGroups: number = typeof createGroupsNow === "number" ? createGroupsNow : 0;

  if (numGroups > 0 && groupStructure !== "Create groups later") {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId },
      select: { userId: true },
      orderBy: { createdAt: "asc" },
    });

    const userIds = enrollments.map(e => e.userId);
    let groupCount = numGroups;

    if (groupStructure === "Split number of students per group" && numGroups > 0) {
      groupCount = Math.ceil(userIds.length / numGroups);
    }
    if (groupCount < 1) groupCount = 1;

    // ── Use "Group 1", "Group 2", ... instead of "{SetName} 1", "{SetName} 2"
    const createdGroups = await Promise.all(
      Array.from({ length: groupCount }, (_, i) =>
        prisma.group.create({
          data: { name: `Group ${i + 1}`, courseId, groupSetId: groupSet.id },
        })
      )
    );

    if (userIds.length > 0) {
      // Distribute members round-robin
      await Promise.all(
        userIds.map((userId, idx) =>
          prisma.groupMember.create({
            data: { userId, groupId: createdGroups[idx % groupCount].id, order: idx },
          })
        )
      );

      // Auto-assign leader per group if enabled
      if (autoAssignLeader) {
        for (const group of createdGroups) {
          const members = await prisma.groupMember.findMany({
            where: { groupId: group.id },
            orderBy: { order: "asc" },
          });
          if (members.length === 0) continue;

          const leaderId = (leaderType === "random")
            ? members[Math.floor(Math.random() * members.length)].id
            : members[0].id; // "first"

          await prisma.groupMember.update({
            where: { id: leaderId },
            data: { isLeader: true },
          });
        }
      }
    }
  }

  const fullGroupSet = await prisma.groupSet.findUnique({
    where: { id: groupSet.id },
    include: { groups: groupsSelect },
  });

  return NextResponse.json({ groupSet: fullGroupSet });
}

export async function DELETE(
  req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const groupSetId = searchParams.get("groupSetId");
  if (!groupSetId)
    return NextResponse.json({ error: "groupSetId required" }, { status: 400 });

  const groups = await prisma.group.findMany({ where: { groupSetId } });
  for (const g of groups) {
    await prisma.groupMember.deleteMany({ where: { groupId: g.id } });
  }
  await prisma.group.deleteMany({ where: { groupSetId } });
  await prisma.groupSet.delete({ where: { id: groupSetId } });
  return NextResponse.json({ success: true });
}