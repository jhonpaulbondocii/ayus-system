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

export async function GET(req: NextRequest) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const courses = await prisma.course.findMany({
    select: {
      id: true, name: true, code: true, color: true,
      image: true,   // ← ADD THIS
      status: true, description: true,
      term: true, startDate: true, endDate: true, createdAt: true, updatedAt: true,
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ courses });
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, code, color, status, description, term, startDate, endDate } = await req.json();

  if (!name || !code)
    return NextResponse.json({ error: "Name and code are required" }, { status: 400 });

  const course = await prisma.course.create({
    data: {
      name,
      code,
      color:       color       ?? "#cc2a27",
      status:      status      ?? "UNPUBLISHED",
      description: description ?? null,
      term:        term        ?? null,
      startDate:   startDate   ? new Date(startDate) : null,
      endDate:     endDate     ? new Date(endDate)   : null,
    },
  });

  return NextResponse.json({ course });
}