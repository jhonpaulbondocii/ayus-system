import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const { searchParams } = new URL(req.url);
    const search      = searchParams.get("search") ?? "";
    const status      = searchParams.get("status") ?? "";
    const type        = searchParams.get("type") ?? "";

    const requests = await prisma.libraryCardRequest.findMany({
      where: {
        courseId,
        ...(status ? { status } : {}),
        ...(type   ? { requestType: type } : {}),
        ...(search ? {
          OR: [
            { name:       { contains: search, mode: "insensitive" } },
            { studentNo:  { contains: search, mode: "insensitive" } },
            { employeeNo: { contains: search, mode: "insensitive" } },
            { email:      { contains: search, mode: "insensitive" } },
          ],
        } : {}),
      },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json({ requests });
  } catch (err) {
    console.error("[GET /library-cards]", err);
    return NextResponse.json({ error: "Failed to load." }, { status: 500 });
  }
}