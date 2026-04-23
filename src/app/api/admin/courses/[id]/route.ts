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
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    select: {
      id: true, name: true, code: true, color: true,
      image: true,   // ← ADD THIS
      status: true, description: true,
      term: true, startDate: true, endDate: true, createdAt: true,
      _count: { select: { enrollments: true } },
    },
  });

  if (!course)
    return NextResponse.json({ error: "Course not found" }, { status: 404 });

  return NextResponse.json({ course });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name, code, color, status, description, term, startDate, endDate } = await req.json();

  const course = await prisma.course.update({
    where: { id },
    data: {
      ...(name        !== undefined && { name }),
      ...(code        !== undefined && { code }),
      ...(color       !== undefined && { color }),
      ...(status      !== undefined && { status }),
      ...(description !== undefined && { description }),
      ...(term        !== undefined && { term }),
      ...(startDate   !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate     !== undefined && { endDate:   endDate   ? new Date(endDate)   : null }),
    },
  });

  return NextResponse.json({ course });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await prisma.course.delete({ where: { id } });

  return NextResponse.json({ success: true });
}