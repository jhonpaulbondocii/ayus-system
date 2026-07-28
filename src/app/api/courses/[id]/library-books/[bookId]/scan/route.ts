import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

// Scan a barcode — returns book info if found
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const { searchParams } = new URL(req.url);
    const accessionNo = searchParams.get("accessionNo")?.trim();
    if (!accessionNo) return NextResponse.json({ error: "accessionNo required" }, { status: 400 });

    const book = await prisma.libraryBook.findUnique({
      where: { courseId_accessionNo: { courseId, accessionNo } },
      include: {
        borrowRecords: {
          where:   { status: "BORROWED" },
          orderBy: { borrowedAt: "desc" },
          take:    1,
        },
      },
    });

    if (!book) return NextResponse.json({ found: false }, { status: 404 });

    return NextResponse.json({
      found:          true,
      book: {
        id:             book.id,
        accessionNo:    book.accessionNo,
        callNumber:     book.callNumber,
        title:          book.title,
        author:         book.author,
        category:       book.category,
        availableCopies:book.availableCopies,
        totalCopies:    book.totalCopies,
        currentBorrow:  book.borrowRecords[0] ?? null,
      },
    });
  } catch (err) {
    console.error("[GET /library-books/scan]", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}