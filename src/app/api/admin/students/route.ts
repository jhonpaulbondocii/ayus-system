// src/app/api/admin/students/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveStudentAge } from "@/lib/age";
import { departmentOfCourse } from "@/lib/academic-programs";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const students = await prisma.student.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Kunin ang guidance sheets na tugma sa student numbers (pinakabago muna)
  const sheets = await prisma.guidanceInfoSheet.findMany({
    where: { studentNo: { in: students.map((s) => s.studentNumber) } },
    orderBy: { submittedAt: "desc" },
  });
  const sheetByNo = new Map<string, (typeof sheets)[number]>();
  for (const sh of sheets) {
    if (!sheetByNo.has(sh.studentNo)) sheetByNo.set(sh.studentNo, sh);
  }

  const merged = students.map((s) => {
    // Resolve display age: computed from birthDate if present, falling back
    // to the manually-entered `age` for legacy/CSV-imported records.
    const base = { ...s, age: resolveStudentAge(s) };
    const sh = sheetByNo.get(s.studentNumber);
    if (!sh) return base;

    /* eslint-disable @typescript-eslint/no-unused-vars */
    const {
      id, courseId, studentNo, name, age, email,
      status, allowResubmit, submittedAt, updatedAt,
      ...sheetFields
    } = sh;
    /* eslint-enable @typescript-eslint/no-unused-vars */

    return {
      ...base,
      ...sheetFields,
      course:     base.course     ?? sh.courseProgram,
      department: base.department ?? departmentOfCourse(sh.courseProgram),
      guidanceSheetId: id,
    };
  });

  return NextResponse.json({ students: merged });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { studentNumber, name, email, address, birthDate, age, gender, course } = body;

  if (!studentNumber?.trim()) return NextResponse.json({ error: "Student number is required." }, { status: 400 });
  if (!name?.trim())          return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const existing = await prisma.student.findUnique({ where: { studentNumber } });
  if (existing) return NextResponse.json({ error: "Student number already exists." }, { status: 400 });

  const student = await prisma.student.create({
    data: {
      studentNumber: studentNumber.trim(),
      name: name.trim(),
      email:     email     ? String(email).trim()   : null,
      address:   address   ? String(address).trim() : null,
      birthDate: birthDate ? new Date(birthDate)     : null,
      age:       age       ? parseInt(age)           : null, // legacy fallback only
      gender:    gender    ? gender.trim()           : null,
      course:    course    ? course.trim()           : null,
    },
  });

  return NextResponse.json({ student }, { status: 201 });
}