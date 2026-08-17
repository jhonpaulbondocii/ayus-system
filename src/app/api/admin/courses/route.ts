import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bulkEnrollAllUsersInFacultyOffice } from "@/lib/faculty-office";

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
      id:          true,
      name:        true,
      code:        true,
      color:       true,
      image:       true,
      status:      true,
      description: true,
      term:        true,
      startDate:   true,
      endDate:     true,
      officeType:  true,
      createdAt:   true,
      updatedAt:   true,
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ courses });
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    name, code, color, status,
    description, term, startDate, endDate, officeType,
  } = await req.json();

  if (!name || !code)
    return NextResponse.json(
      { error: "Name and code are required" },
      { status: 400 }
    );

  // Check for duplicate code
  const existing = await prisma.course.findFirst({ where: { code } });
  if (existing) {
    return NextResponse.json(
      { error: `An office with code "${code}" already exists.` },
      { status: 409 }
    );
  }

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
      officeType:  officeType  ?? null,
    },
  });

  // If Faculty office — auto-enroll all existing approved users
  if (officeType === "FACULTY") {
    bulkEnrollAllUsersInFacultyOffice(course.id).catch(err =>
      console.error("[Faculty Office] Bulk enroll failed:", err)
    );
  }

  return NextResponse.json({ course });
}