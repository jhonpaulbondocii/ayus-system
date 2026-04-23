// src/app/api/admin/courses/[id]/route.ts
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // ✅ Fixed
) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;  // ✅ Added await

  const course = await prisma.course.findUnique({
    where: { id },  // ✅ Using destructured id
    select: {
      id:          true,
      name:        true,
      code:        true,
      status:      true,
      description: true,
      term:        true,
      startDate:   true,
      endDate:     true,
      createdAt:   true,
      _count: { select: { enrollments: true } },
    },
  });

  if (!course)
    return NextResponse.json({ error: "Course not found" }, { status: 404 });

  return NextResponse.json({ course });
}