// src/app/api/admin/courses/[id]/groupsets/[groupSetId]/groups/route.ts
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

// POST /api/admin/courses/[id]/groupsets/[groupSetId]/groups
// Create a new group inside a group set
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; groupSetId: string }> }
) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId, groupSetId } = await params;
  const { name, membershipLimit } = await req.json();

  if (!name?.trim())
    return NextResponse.json({ error: "Group name required" }, { status: 400 });

  const group = await prisma.group.create({
    data: {
      name:       name.trim(),
      courseId,
      groupSetId,
    },
  });

  return NextResponse.json({ group });
}

// GET /api/admin/courses/[id]/groupsets/[groupSetId]/groups
// List all groups in a group set with members
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; groupSetId: string }> }
) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupSetId } = await params;

  const groups = await prisma.group.findMany({
    where: { groupSetId },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, pronouns: true } },
        },
      },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ groups });
}