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
    const status = searchParams.get("status") ?? "";
    const search = searchParams.get("search") ?? "";

    // Auto-update overdue
    await prisma.libraryBorrowRecord.updateMany({
      where: {
        courseId,
        status:    "BORROWED",
        dueDate:   { lt: new Date() },
      },
      data: { status: "OVERDUE" },
    });

    const records = await prisma.libraryBorrowRecord.findMany({
      where: {
        courseId,
        ...(status ? { status } : {}),
        ...(search ? {
          OR: [
            { borrowerName: { contains: search, mode: "insensitive" } },
            { borrowerNo:   { contains: search, mode: "insensitive" } },
            { book: { title:       { contains: search, mode: "insensitive" } } },
            { book: { accessionNo: { contains: search, mode: "insensitive" } } },
          ],
        } : {}),
      },
      include: { book: { select: { title: true, accessionNo: true, callNumber: true, category: true } } },
      orderBy: { borrowedAt: "desc" },
    });

    return NextResponse.json({ records });
  } catch (err) {
    console.error("[GET /library-borrow]", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const body = await req.json();
    const {
      bookId, borrowerType, borrowerId,
      borrowerNo, borrowerName, borrowerCourse,
      borrowerDept, dueDate, remarks,
    } = body;

    if (!bookId)        return NextResponse.json({ error: "Book is required." },         { status: 400 });
    if (!borrowerName)  return NextResponse.json({ error: "Borrower name is required." },{ status: 400 });
    if (!dueDate)       return NextResponse.json({ error: "Due date is required." },      { status: 400 });

    // Check availability
    const book = await prisma.libraryBook.findUnique({ where: { id: bookId } });
    if (!book || book.courseId !== courseId)
      return NextResponse.json({ error: "Book not found." }, { status: 404 });
    if (book.availableCopies < 1)
      return NextResponse.json({ error: "No available copies." }, { status: 400 });

    const [record] = await prisma.$transaction([
      prisma.libraryBorrowRecord.create({
        data: {
          courseId,
          bookId,
          borrowerType:   borrowerType   ?? "STUDENT",
          borrowerId:     borrowerId     ?? null,
          borrowerNo:     borrowerNo     ?? null,
          borrowerName:   borrowerName.trim(),
          borrowerCourse: borrowerCourse ?? null,
          borrowerDept:   borrowerDept   ?? null,
          dueDate:        new Date(dueDate),
          remarks:        remarks        ?? null,
          status:         "BORROWED",
        },
        include: { book: true },
      }),
      prisma.libraryBook.update({
        where: { id: bookId },
        data:  { availableCopies: { decrement: 1 } },
      }),
    ]);

    return NextResponse.json({ record });
  } catch (err) {
    console.error("[POST /library-borrow]", err);
    return NextResponse.json({ error: "Failed to borrow." }, { status: 500 });
  }
}