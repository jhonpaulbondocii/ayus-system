// src/app/api/admin/students/[studentId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studentId } = await params;
  const body = await req.json();
  const { studentNumber, name, email, age, gender, course } = body;

  const student = await prisma.student.update({
    where: { id: studentId },
    data: {
      ...(studentNumber !== undefined && { studentNumber: studentNumber.trim() }),
      ...(name          !== undefined && { name:          name.trim()          }),
      ...(email         !== undefined && { email:         email ? String(email).trim() : null }),
      ...(age           !== undefined && { age:           age ? parseInt(age) : null }),
      ...(gender        !== undefined && { gender:        gender || null       }),
      ...(course        !== undefined && { course:        course || null       }),
    },
  });

  return NextResponse.json({ student });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studentId } = await params;
  await prisma.student.delete({ where: { id: studentId } });
  return NextResponse.json({ success: true });
}