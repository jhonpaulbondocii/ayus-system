import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const { id: courseId, recordId } = await params;
    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const body = await req.json();

    const existing = await prisma.libraryBorrowRecord.findUnique({
      where: { id: recordId },
    });
    if (!existing || existing.courseId !== courseId)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Return book
    if (body.action === "return") {
      const [record] = await prisma.$transaction([
        prisma.libraryBorrowRecord.update({
          where: { id: recordId },
          data: {
            status:     "RETURNED",
            returnedAt: new Date(),
            remarks:    body.remarks ?? existing.remarks,
          },
          include: { book: true },
        }),
        prisma.libraryBook.update({
          where: { id: existing.bookId },
          data:  { availableCopies: { increment: 1 } },
        }),
      ]);
      return NextResponse.json({ record });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[PATCH /library-borrow/:recordId]", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}