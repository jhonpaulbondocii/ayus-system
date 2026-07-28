import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEPARTMENTS_AND_COURSES: Record<string, string[]> = {
  "College of Education": [
    "Bachelor of Elementary Education",
    "Bachelor of Secondary Education Major in Filipino",
    "Bachelor of Secondary Education Major in Mathematics",
    "Bachelor of Secondary Education Major in Science",
    "Bachelor of Secondary Education Major in Social Studies",
    "Bachelor of Secondary Education Major in Physical Education",
  ],
  "College of Business Studies": [
    "Bachelor of Science in Accountancy",
    "Bachelor of Science in Business Administration",
  ],
  "College of Hospitality & Tourism Management": [
    "Bachelor of Science in Hospitality Management",
  ],
  "College of Computing Studies": [
    "Bachelor of Science in Information Technology",
  ],
  "College of Industrial Technology": [
    "Bachelor of Industrial Technology Major in Automotive Technology",
  ],
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department")?.trim();

    if (department) {
      // Return courses for the selected department
      // Merge hardcoded + any additional courses from DB
      const hardcoded = DEPARTMENTS_AND_COURSES[department] ?? [];
      const fromDb = await prisma.student.findMany({
        where:    { department, course: { not: null } },
        select:   { course: true },
        distinct: ["course"],
        orderBy:  { course: "asc" },
      });
      const dbCourses = fromDb.map(s => s.course).filter(Boolean) as string[];
      const courses = [...new Set([...hardcoded, ...dbCourses])];
      return NextResponse.json({ courses });
    } else {
      // Return departments
      // Merge hardcoded + any additional departments from DB
      const hardcoded = Object.keys(DEPARTMENTS_AND_COURSES);
      const fromDb = await prisma.student.findMany({
        where:    { department: { not: null } },
        select:   { department: true },
        distinct: ["department"],
        orderBy:  { department: "asc" },
      });
      const dbDepts = fromDb.map(s => s.department).filter(Boolean) as string[];
      const departments = [...new Set([...hardcoded, ...dbDepts])];
      return NextResponse.json({ departments });
    }
  } catch (err) {
    console.error("[GET /api/admin/students/courses]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}