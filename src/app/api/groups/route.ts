// src/app/api/groups/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ groups: [] });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
  if (!user) return NextResponse.json({ groups: [] });

  // ADMIN: return all group sets
  if (user.role === "ADMIN") {
    const groupSets = await prisma.groupSet.findMany({
      include: {
        course: { select: { id: true, name: true, term: true } },
        groups: { select: { id: true }, take: 1 }, // get first group id
      },
      orderBy: { createdAt: "desc" },
    });

    const groups = groupSets.map(gs => ({
      id:         gs.groups[0]?.id ?? gs.id, // use actual group id
      name:       gs.name,
      courseId:   gs.courseId,
      groupSetId: gs.id,
      courseName: gs.course.name,
      term:       gs.course.term ?? null,
    }));

    return NextResponse.json({ groups });
  }

  // STAFF: return only groups the user is a member of
  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    include: {
      group: {
        include: {
          groupSet: { select: { id: true, name: true } },
          course:   { select: { id: true, name: true, term: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Deduplicate by group id — one row per group
  const seen   = new Set<string>();
  const groups = memberships
    .filter(m => {
      if (seen.has(m.group.id)) return false;
      seen.add(m.group.id);
      return true;
    })
    .map(m => ({
      id:         m.group.id,               // ← actual groupId, not groupSetId
      name:       m.group.groupSet?.name
                    ? `${m.group.groupSet.name} - ${m.group.name}`
                    : m.group.name,
      courseId:   m.group.courseId,
      groupSetId: m.group.groupSetId ?? null,
      courseName: m.group.course.name,
      term:       m.group.course.term ?? null,
    }));

  return NextResponse.json({ groups });
}