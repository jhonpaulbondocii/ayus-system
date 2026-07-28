import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

// Look up borrower by student/employee number from system
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const { searchParams } = new URL(req.url);
    const no = searchParams.get("no")?.trim();
    if (!no) return NextResponse.json({ found: false });

    // Search Student table by studentNumber
    const student = await prisma.student.findFirst({
      where: {
        studentNumber: { equals: no, mode: "insensitive" },
      },
    });

    if (student) {
      return NextResponse.json({
        found:          true,
        borrowerId:     student.id,
        borrowerName:   student.name,
        borrowerNo:     student.studentNumber,
        borrowerType:   "STUDENT",
        borrowerCourse: student.course ?? null,
        borrowerDept:   null,
      });
    }

    // Fallback: search User table by email (for employees)
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: no, mode: "insensitive" },
      },
      select: {
        id: true, name: true, email: true,
        department: true, position: true,
      },
    });

    if (!user) return NextResponse.json({ found: false });

    return NextResponse.json({
      found:          true,
      borrowerId:     user.id,
      borrowerName:   user.name,
      borrowerNo:     no,
      borrowerType:   "EMPLOYEE",
      borrowerCourse: null,
      borrowerDept:   user.department ?? null,
    });
  } catch (err) {
    console.error("[GET /library-borrow/lookup]", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}