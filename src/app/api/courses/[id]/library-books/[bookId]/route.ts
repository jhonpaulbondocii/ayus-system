import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bookId: string }> }
) {
  try {
    const { id: courseId, bookId } = await params;
    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const book = await prisma.libraryBook.findUnique({
      where: { id: bookId },
      include: {
        borrowRecords: {
          orderBy: { borrowedAt: "desc" },
          take: 20,
        },
      },
    });
    if (!book || book.courseId !== courseId)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ book });
  } catch (err) {
    console.error("[GET /library-books/:bookId]", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bookId: string }> }
) {
  try {
    const { id: courseId, bookId } = await params;
    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const body = await req.json();
    const allowed = [
      "accessionNo","callNumber","isbn","title","author",
      "publisher","copyrightYear","edition","pages","volume",
      "category","location","totalCopies","availableCopies","coverUrl",
    ];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }
    if (body.pages) update.pages = parseInt(body.pages);
    if (body.totalCopies) update.totalCopies = parseInt(body.totalCopies);

    const book = await prisma.libraryBook.update({
      where: { id: bookId },
      data:  update,
    });
    return NextResponse.json({ book });
  } catch (err) {
    console.error("[PATCH /library-books/:bookId]", err);
    return NextResponse.json({ error: "Failed to update." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bookId: string }> }
) {
  try {
    const { id: courseId, bookId } = await params;
    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const book = await prisma.libraryBook.findUnique({ where: { id: bookId } });
    if (!book || book.courseId !== courseId)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.libraryBook.delete({ where: { id: bookId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /library-books/:bookId]", err);
    return NextResponse.json({ error: "Failed to delete." }, { status: 500 });
  }
}