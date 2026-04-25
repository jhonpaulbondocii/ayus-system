// src/app/api/courses/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { id: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // ── ADMIN: return ALL courses ──────────────────────────────────────────────
  if (user.role === "ADMIN") {
    const allCourses = await prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id:        true,
        name:      true,
        code:      true,
        color:     true,
        image:     true,
        status:    true,
        term:      true,
        startDate: true,
        endDate:   true,
      },
    });

    return NextResponse.json({ courses: allCourses });
  }

  // ── STAFF/HEAD: return only enrolled courses ───────────────────────────────
  const enrollments = await prisma.courseEnrollment.findMany({
    where:   { userId: user.id },
    include: { course: true },
    orderBy: { createdAt: "desc" },
  });

  const courses = enrollments.map(e => ({
    id:        e.course.id,
    name:      e.course.name,
    code:      e.course.code,
    color:     e.course.color,
    image:     e.course.image,   // ← added
    status:    e.course.status,
    term:      e.course.term,
    startDate: e.course.startDate,
    endDate:   e.course.endDate,
  }));

  return NextResponse.json({ courses });
}