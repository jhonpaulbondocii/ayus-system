// src/app/api/admin/students/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const students = await prisma.student.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ students });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { studentNumber, name, age, gender, course } = body;

  if (!studentNumber?.trim()) return NextResponse.json({ error: "Student number is required." }, { status: 400 });
  if (!name?.trim())          return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const existing = await prisma.student.findUnique({ where: { studentNumber } });
  if (existing) return NextResponse.json({ error: "Student number already exists." }, { status: 400 });

  const student = await prisma.student.create({
    data: {
      studentNumber: studentNumber.trim(),
      name: name.trim(),
      age:    age    ? parseInt(age)    : null,
      gender: gender ? gender.trim()    : null,
      course: course ? course.trim()    : null,
    },
  });

  return NextResponse.json({ student }, { status: 201 });
}