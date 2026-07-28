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
    const search   = searchParams.get("search")   ?? "";
    const category = searchParams.get("category") ?? "";

    const books = await prisma.libraryBook.findMany({
      where: {
        courseId,
        ...(category ? { category } : {}),
        ...(search ? {
          OR: [
            { title:       { contains: search, mode: "insensitive" } },
            { author:      { contains: search, mode: "insensitive" } },
            { accessionNo: { contains: search, mode: "insensitive" } },
            { callNumber:  { contains: search, mode: "insensitive" } },
            { isbn:        { contains: search, mode: "insensitive" } },
          ],
        } : {}),
      },
      include: {
        _count: { select: { borrowRecords: { where: { status: "BORROWED" } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Stats
    const stats = await prisma.libraryBook.groupBy({
      by:     ["category"],
      where:  { courseId },
      _count: { id: true },
      _sum:   { totalCopies: true, availableCopies: true },
    });

    return NextResponse.json({ books, stats });
  } catch (err) {
    console.error("[GET /library-books]", err);
    return NextResponse.json({ error: "Failed to load." }, { status: 500 });
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
      accessionNo, callNumber, isbn, title, author,
      publisher, copyrightYear, edition, pages, volume,
      category, location, totalCopies, coverUrl,
    } = body;

    if (!title?.trim())       return NextResponse.json({ error: "Title is required." },        { status: 400 });
    if (!accessionNo?.trim()) return NextResponse.json({ error: "Accession No. is required." },{ status: 400 });
    if (!category)            return NextResponse.json({ error: "Category is required." },      { status: 400 });

    // Check duplicate accession no
    const existing = await prisma.libraryBook.findUnique({
      where: { courseId_accessionNo: { courseId, accessionNo: accessionNo.trim() } },
    });
    if (existing) return NextResponse.json({ error: "Accession No. already exists." }, { status: 409 });

    const copies = Math.max(1, parseInt(totalCopies) || 1);

    const book = await prisma.libraryBook.create({
      data: {
        courseId,
        accessionNo:    accessionNo.trim(),
        callNumber:     callNumber    || null,
        isbn:           isbn          || null,
        title:          title.trim(),
        author:         author        || null,
        publisher:      publisher     || null,
        copyrightYear:  copyrightYear || null,
        edition:        edition       || null,
        pages:          pages ? parseInt(pages) : null,
        volume:         volume        || null,
        category,
        location:       location      || null,
        totalCopies:    copies,
        availableCopies:copies,
        coverUrl:       coverUrl      || null,
      },
    });

    return NextResponse.json({ book });
  } catch (err) {
    console.error("[POST /library-books]", err);
    return NextResponse.json({ error: "Failed to create." }, { status: 500 });
  }
}