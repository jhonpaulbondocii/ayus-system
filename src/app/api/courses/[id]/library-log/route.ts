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
    const search   = searchParams.get("search") ?? "";
    const dateFrom = searchParams.get("dateFrom") ?? "";
    const dateTo   = searchParams.get("dateTo") ?? "";
    const type     = searchParams.get("type") ?? "";   // "STUDENT" | "EMPLOYEE" | ""

    const logs = await prisma.libraryReceivingLog.findMany({
      where: {
        courseId,
        ...(type ? {
          request: { applicantType: type as "STUDENT" | "EMPLOYEE" },
        } : {}),
        ...(search ? {
          OR: [
            { name:       { contains: search, mode: "insensitive" } },
            { collegeDept:{ contains: search, mode: "insensitive" } },
          ],
        } : {}),
        ...(dateFrom || dateTo ? {
          dateReceived: {
            ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00`) } : {}),
            ...(dateTo   ? { lte: new Date(`${dateTo}T23:59:59`)   } : {}),
          },
        } : {}),
      },
      include: { request: { select: { requestType: true, applicantType: true } } },
      orderBy: { dateReceived: "desc" },
    });

    return NextResponse.json({ logs });
  } catch (err) {
    console.error("[GET /library-log]", err);
    return NextResponse.json({ error: "Failed to load." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const { searchParams } = new URL(req.url);
    const logId = searchParams.get("logId");
    if (!logId) return NextResponse.json({ error: "logId required" }, { status: 400 });

    await prisma.libraryReceivingLog.delete({ where: { id: logId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /library-log]", err);
    return NextResponse.json({ error: "Failed to delete." }, { status: 500 });
  }
}