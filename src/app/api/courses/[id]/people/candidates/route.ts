import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: courseId } = await params;

  const access = await requireCoursePermission(courseId, "manage_people");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();

  const users = await prisma.user.findMany({
    where: {
      role: { not: "ADMIN" },
      status: "APPROVED",
      enrollments: { none: { courseId } },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true, email: true, image: true },
    orderBy: { name: "asc" },
    take: 200,
  });

  return NextResponse.json({ users });
}