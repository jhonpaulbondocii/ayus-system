import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;

    const course = await prisma.course.findUnique({
      where:  { id: courseId },
      select: { name: true, officeType: true, status: true },
    });

    if (!course)
      return NextResponse.json({ error: "Office not found" }, { status: 404 });
    if (course.officeType !== "LIBRARY")
      return NextResponse.json({ error: "Not a library office" }, { status: 403 });
    if (course.status !== "PUBLISHED")
      return NextResponse.json({ error: "This form is not currently accepting submissions" }, { status: 403 });

    return NextResponse.json({ name: course.name });
  } catch (err) {
    console.error("[GET /library/info]", err);
    return NextResponse.json({ error: "Failed to load form." }, { status: 500 });
  }
}