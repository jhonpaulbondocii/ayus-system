// src/app/api/admin/courses/[id]/groups/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  return session;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAuth())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const groups = await prisma.group.findMany({
    where: { courseId: id },
    include: {
      members: {
        select: { userId: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const result = groups.map(g => ({
    id:        g.id,
    name:      g.name,
    // flat array of userIds so the frontend can filter students by group
    memberIds: g.members.map(m => m.userId),
  }));

  return NextResponse.json({ groups: result });
}