// src/app/api/courses/[id]/people/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: courseId } = await params;

  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId },
    include: {
      user: {
        select: {
          id:       true,
          name:     true,
          email:    true,
          image:    true,
          pronouns: true,
          role:     true,
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  const people = enrollments.map((e) => ({
    id:        e.user.id,
    name:      e.user.name,
    email:     e.user.email,
    image:     e.user.image,
    pronouns:  e.user.pronouns,
    // courseRole is "Student", "Teacher", etc. — use this for role filtering in the picker
    role:      e.courseRole,
  }));

  return NextResponse.json({ people });
}