// src/app/api/courses/[id]/groupsets/[gsId]/groups/route.ts
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
   GET /api/courses/[id]/groupsets/[gsId]/groups
───────────────────────────────────────────────────────────────── */
export async function GET(
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
    if (!caller)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const groups = await prisma.group.findMany({
    where: { groupSetId: gsId, courseId },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, pronouns: true } },
        },
        orderBy: { order: "asc" },
      },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ groups });
}

/* ─────────────────────────────────────────────────────────────────
   POST /api/courses/[id]/groupsets/[gsId]/groups
   — Create a new group inside a group set
───────────────────────────────────────────────────────────────── */
export async function POST(
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
      return NextResponse.json({ error: "Only Head or Staff can create groups." }, { status: 403 });
  }

  // Verify group set belongs to this course
  const groupSet = await prisma.groupSet.findFirst({
    where: { id: gsId, courseId },
  });
  if (!groupSet)
    return NextResponse.json({ error: "Group set not found." }, { status: 404 });

  const body = await req.json();
  const { name, membershipLimit } = body;

  if (!name?.trim())
    return NextResponse.json({ error: "Group name is required." }, { status: 400 });

  const group = await prisma.group.create({
    data: {
      name:      name.trim(),
      courseId,
      groupSetId: gsId,
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, pronouns: true } },
        },
      },
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json({ group }, { status: 201 });
}