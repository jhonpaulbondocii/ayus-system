import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

// Get all books for inventory check
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const books = await prisma.libraryBook.findMany({
      where:   { courseId },
      select: {
        id: true, accessionNo: true, title: true,
        author: true, category: true, callNumber: true,
        totalCopies: true, availableCopies: true,
      },
      orderBy: { accessionNo: "asc" },
    });

    return NextResponse.json({ books, total: books.length });
  } catch (err) {
    console.error("[GET /library-inventory]", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}