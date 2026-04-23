// src/app/api/admin/courses/[id]/sections/route.ts
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

  const enrollments = await prisma.courseEnrollment.findMany({
    where:   { courseId: id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const sections = enrollments.map(e => ({
    id:   e.user.id,
    name: e.user.name,
  }));

  return NextResponse.json({ sections });
}