// src/app/api/admin/groupsets/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ groupSets: [] });

  const groupSets = await prisma.groupSet.findMany({
    include: {
      course: { select: { id: true, name: true } },
      groups: {
        include: {
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = groupSets.map(gs => ({
    id:          gs.id,
    name:        gs.name,
    courseId:    gs.courseId,
    courseName:  gs.course.name,
    groupCount:  gs.groups.length,
    memberCount: gs.groups.reduce((sum, g) => sum + g._count.members, 0),
    createdAt:   gs.createdAt,
  }));

  return NextResponse.json({ groupSets: result });
}