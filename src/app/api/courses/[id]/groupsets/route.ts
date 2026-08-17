// src/app/api/courses/[id]/groupsets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const membersSelect = {
  select: {
    isLeader: true,
    order: true,
    user: { select: { id: true, name: true, pronouns: true } },
  },
  orderBy: { order: "asc" as const },
};

const groupsInclude = {
  select: {
    id: true,
    name: true,
    _count: { select: { members: true } },
    members: membersSelect,
  },
};

/** Returns enrollment of caller in course, or null. */
async function getCallerEnrollment(userId: string, courseId: string) {
  return prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
}

/** Head or Staff (not Faculty) can manage groups. */
function canManage(courseRole: string): boolean {
  const roles = courseRole.split(",").map((r) => r.trim());
  return roles.includes("Head") || roles.includes("Staff");
}

/* ─────────────────────────────────────────────────────────────────
   GET /api/courses/[id]/groupsets
   — Returns all group sets with their groups and members
───────────────────────────────────────────────────────────────── */
export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId } = await params;

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  if (!isAdmin) {
    const caller = await getCallerEnrollment(session.user.id, courseId);
    if (!caller)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const groupSets = await prisma.groupSet.findMany({
    where: { courseId },
    include: { groups: groupsInclude },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ groupSets });
}

/* ─────────────────────────────────────────────────────────────────
   POST /api/courses/[id]/groupsets
   — Creates a new group set (Head or Staff only)
───────────────────────────────────────────────────────────────── */
export async function POST(
  req: NextRequest,
  { params }: Params
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId } = await params;

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  if (!isAdmin) {
    const caller = await getCallerEnrollment(session.user.id, courseId);
    if (!caller || !canManage(caller.courseRole))
      return NextResponse.json({ error: "Only Head or Staff can create group sets." }, { status: 403 });
  }

  const body = await req.json();
  const {
    name, selfSignUp, requireSameSection, groupStructure,
    createGroupsNow, limitGroupMembers, autoAssignLeader, leaderType,
  } = body;

  if (!name?.trim())
    return NextResponse.json({ error: "Group Set Name is required." }, { status: 400 });

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

  const numGroups: number =
    typeof createGroupsNow === "number" ? createGroupsNow : 0;

  if (numGroups > 0 && groupStructure !== "Create groups later") {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId },
      select: { userId: true },
      orderBy: { createdAt: "asc" },
    });

    const userIds = enrollments.map((e) => e.userId);
    let groupCount = numGroups;

    if (
      groupStructure === "Split number of staff per group" &&
      numGroups > 0
    ) {
      groupCount = Math.ceil(userIds.length / numGroups);
    }
    if (groupCount < 1) groupCount = 1;

    const createdGroups = await Promise.all(
      Array.from({ length: groupCount }, (_, i) =>
        prisma.group.create({
          data: { name: `Group ${i + 1}`, courseId, groupSetId: groupSet.id },
        })
      )
    );

    if (userIds.length > 0) {
      await Promise.all(
        userIds.map((userId, idx) =>
          prisma.groupMember.create({
            data: {
              userId,
              groupId: createdGroups[idx % groupCount].id,
              order: idx,
            },
          })
        )
      );

      if (autoAssignLeader) {
        for (const group of createdGroups) {
          const members = await prisma.groupMember.findMany({
            where: { groupId: group.id },
            orderBy: { order: "asc" },
          });
          if (members.length === 0) continue;

          const leaderId =
            leaderType === "random"
              ? members[Math.floor(Math.random() * members.length)].id
              : members[0].id;

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
    include: { groups: groupsInclude },
  });

  return NextResponse.json({ groupSet: fullGroupSet }, { status: 201 });
}

/* ─────────────────────────────────────────────────────────────────
   DELETE /api/courses/[id]/groupsets?groupSetId=xxx
   — Deletes a group set and all its groups/members
───────────────────────────────────────────────────────────────── */
export async function DELETE(
  req: NextRequest,
  { params }: Params
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId } = await params;

  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  if (!isAdmin) {
    const caller = await getCallerEnrollment(session.user.id, courseId);
    if (!caller || !canManage(caller.courseRole))
      return NextResponse.json({ error: "Only Head or Staff can delete group sets." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const groupSetId = searchParams.get("groupSetId");
  if (!groupSetId)
    return NextResponse.json({ error: "groupSetId required." }, { status: 400 });

  // Verify group set belongs to this course
  const groupSet = await prisma.groupSet.findFirst({
    where: { id: groupSetId, courseId },
  });
  if (!groupSet)
    return NextResponse.json({ error: "Group set not found." }, { status: 404 });

  const groups = await prisma.group.findMany({ where: { groupSetId } });
  for (const g of groups) {
    await prisma.groupMember.deleteMany({ where: { groupId: g.id } });
  }
  await prisma.group.deleteMany({ where: { groupSetId } });
  await prisma.groupSet.delete({ where: { id: groupSetId } });

  return NextResponse.json({ success: true });
}