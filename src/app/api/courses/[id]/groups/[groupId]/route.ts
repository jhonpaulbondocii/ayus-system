// src/app/api/courses/[id]/groups/[groupId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId, groupId } = await params;
  const userId = (session.user as { id?: string })?.id ?? "";

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      groupSet: { select: { id: true, name: true } },
      course:   { select: { id: true, name: true, code: true, color: true } },
      members: {
        include: {
          user: {
            select: {
              id:         true,
              name:       true,
              image:      true,
              email:      true,
              department: true,
              position:   true,
            },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!group || group.courseId !== courseId) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const isMember = group.members.some(m => m.userId === userId);

  return NextResponse.json({
    group: {
      id:           group.id,
      name:         group.name,
      courseId:     group.courseId,
      courseName:   group.course.name,
      courseCode:   group.course.code,
      courseColor:  group.course.color,
      groupSetId:   group.groupSet?.id ?? null,
      groupSetName: group.groupSet?.name ?? null,
      isMember,
      members: group.members.map(m => ({
        id:         m.user.id,
        name:       m.user.name,
        email:      m.user.email,
        image:      m.user.image,
        department: m.user.department,
        position:   m.user.position,
        isLeader:   m.isLeader,
        order:      m.order,
      })),
    },
  });
}