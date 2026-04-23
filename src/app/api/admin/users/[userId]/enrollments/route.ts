// src/app/api/admin/users/[userId]/enrollments/route.ts
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

// GET — list enrollments for a user
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const enrollments = await prisma.courseEnrollment.findMany({
    where: { userId },
    include: { course: { select: { id: true, name: true, code: true, color: true } } },
    orderBy: { createdAt: "asc" },
  });

  const result = enrollments.map(e => ({
    courseId:   e.course.id,
    courseName: e.course.name,
    courseCode: e.course.code,
    color:      e.course.color,
    role:       user?.role ?? "STAFF",
    createdAt:  e.createdAt.toISOString(),
  }));

  return NextResponse.json({ enrollments: result });
}

// POST — enroll user to a course
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;
  const { courseId } = await req.json();

  if (!courseId)
    return NextResponse.json({ error: "courseId is required" }, { status: 400 });

  // Check if already enrolled
  const existing = await prisma.courseEnrollment.findFirst({
    where: { userId, courseId },
  });
  if (existing)
    return NextResponse.json({ error: "Already enrolled" }, { status: 409 });

  const enrollment = await prisma.courseEnrollment.create({
    data: { userId, courseId },
    include: { course: { select: { id: true, name: true, code: true, color: true } } },
  });

  return NextResponse.json({
    enrollment: {
      courseId:   enrollment.course.id,
      courseName: enrollment.course.name,
      courseCode: enrollment.course.code,
      color:      enrollment.course.color,
      createdAt:  enrollment.createdAt.toISOString(),
    }
  });
}

// DELETE — unenroll user from a course
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!await requireAdmin())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;
  const { courseId } = await req.json();

  if (!courseId)
    return NextResponse.json({ error: "courseId is required" }, { status: 400 });

  await prisma.courseEnrollment.deleteMany({
    where: { userId, courseId },
  });

  return NextResponse.json({ message: "Unenrolled successfully" });
}