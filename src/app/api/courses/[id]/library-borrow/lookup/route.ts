import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

// Inaalis ang espasyo, gitling, tuldok, underscore, at control characters ng scanner
const norm = (s: string) => s.replace(/[\s\-_.\u0000-\u001f]/g, "").toLowerCase();

// Look up borrower by student/employee number from system
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const raw = new URL(req.url).searchParams.get("no")?.trim();
    if (!raw) return NextResponse.json({ found: false });
    const no = norm(raw);
    if (!no) return NextResponse.json({ found: false });

    /* 1 · Student table (exact, hindi sensitibo sa laki ng letra) */
    const student = await prisma.student.findFirst({
      where: { studentNumber: { equals: raw, mode: "insensitive" } },
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

    /* 2 · Library card requests (studentNo / employeeNo, hindi na apektado ng gitling o espasyo) */
    const cards = await prisma.libraryCardRequest.findMany({
      where: {
        courseId,
        status: { not: "REJECTED" },
        OR: [{ studentNo: { not: null } }, { employeeNo: { not: null } }],
      },
      orderBy: { submittedAt: "desc" },
      select: {
        name: true, applicantType: true,
        studentNo: true, courseProgram: true, yearSection: true,
        employeeNo: true, collegeDept: true,
      },
    });
    const card = cards.find(c => norm(c.studentNo ?? "") === no || norm(c.employeeNo ?? "") === no);
    if (card) {
      const isStudent = card.applicantType === "STUDENT";
      return NextResponse.json({
        found:          true,
        borrowerId:     null, // walang Student/User record
        borrowerName:   card.name,
        borrowerNo:     isStudent ? card.studentNo : card.employeeNo,
        borrowerType:   isStudent ? "STUDENT" : "EMPLOYEE",
        borrowerCourse: isStudent ? [card.courseProgram, card.yearSection].filter(Boolean).join(" ") || null : null,
        borrowerDept:   isStudent ? null : card.collegeDept ?? null,
      });
    }

    /* 3 · Employee fallback: User by email */
    const user = await prisma.user.findFirst({
      where: { email: { equals: raw, mode: "insensitive" } },
      select: { id: true, name: true, department: true },
    });
    if (!user) return NextResponse.json({ found: false });

    return NextResponse.json({
      found:          true,
      borrowerId:     user.id,
      borrowerName:   user.name,
      borrowerNo:     raw,
      borrowerType:   "EMPLOYEE",
      borrowerCourse: null,
      borrowerDept:   user.department ?? null,
    });
  } catch (err) {
    console.error("[GET /library-borrow/lookup]", err);
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}