// src/app/api/courses/[id]/groups/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as { id?: string })?.id ?? "";

  const groupSets = await prisma.groupSet.findMany({
    where: { courseId: id },
    include: {
      groups: {
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, image: true } },
            },
            orderBy: { order: "asc" },
          },
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const groups = groupSets.flatMap(gs =>
    gs.groups.map(g => ({
      id:           g.id,
      name:         g.name,
      groupSetId:   gs.id,
      groupSetName: gs.name,
      memberCount:  g._count.members,
      isMember:     g.members.some(m => m.userId === userId),
      members:      g.members.map(m => ({
        id:       m.user.id,
        name:     m.user.name,
        image:    m.user.image,
        isLeader: m.isLeader, // ← added
      })),
    }))
  );

  return NextResponse.json({ groups });
}