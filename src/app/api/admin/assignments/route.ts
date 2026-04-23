// src/app/api/admin/assignments/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const assignments = await prisma.assignment.findMany({
      where: { dueDate: { not: null } },
      include: {
        course: { select: { id: true, name: true, code: true, color: true } },
        group:  { select: { id: true, name: true, groupSetId: true } },
      },
      orderBy: { dueDate: "asc" },
    });

    return NextResponse.json({
      assignments: assignments.map(a => ({
        id:             a.id,
        title:          a.title,
        description:    a.description    ?? null,
        dueDate:        a.dueDate!.toISOString(),
        availableUntil: a.availableUntil ? a.availableUntil.toISOString() : null,
        status:         a.status,
        course:         a.course ?? null,
        group:          a.group  ?? null,
      })),
    });
  } catch (err) {
    console.error("[admin/assignments] GET error:", err);
    return NextResponse.json({ assignments: [] });
  }
}