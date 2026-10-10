// src/app/api/admin/courses/[id]/enrollments/recent/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireHeadOrAdmin } from "@/lib/require-head-or-admin";

const formatTime = (date: Date): string => {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;

  const auth = await requireHeadOrAdmin(courseId);
  if (!auth.ok)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const recent = await prisma.courseEnrollment.findMany({
      where: { courseId },
      select: {
        id: true,
        courseRole: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const enrollments = recent.map((e) => ({
      id: e.id,
      name: e.user.name,
      image: e.user.image,
      role: e.courseRole,
      joinedAt: formatTime(e.createdAt),
    }));

    return NextResponse.json({ enrollments });
  } catch (error) {
    console.error("[enrollments/recent] Prisma error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}