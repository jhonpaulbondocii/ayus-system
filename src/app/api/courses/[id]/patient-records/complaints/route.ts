// src/app/api/courses/[id]/patient-records/complaints/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/courses/[id]/patient-records/complaints
// Returns a list of distinct previously-used chief complaints for this clinic,
// most recent first — powers the autocomplete dropdown in the Add Visit modal.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const records = await prisma.patientRecord.findMany({
      where: { courseId },
      select: { complaint: true },
      orderBy: { visitDate: "desc" },
      take: 500, // sapat na window — di na kailangang scan-in lahat ng records magpakailanman
    });

    const seen = new Set<string>();
    const complaints: string[] = [];

    for (const r of records) {
      const c = r.complaint.trim();
      const key = c.toLowerCase();
      if (c && !seen.has(key)) {
        seen.add(key);
        complaints.push(c);
      }
    }

    return NextResponse.json({ complaints });
  } catch (err) {
    console.error("[GET /patient-records/complaints]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}