// src/app/api/courses/[id]/medical-cases-summary/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireCoursePermission } from "@/lib/course-access";
import { computeMedicalCasesSummary } from "@/lib/medical-cases-aggregate";
import { COLLEGE_CODES, COLLEGE_LABELS } from "@/lib/medical-cases-config";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/courses/[id]/medical-cases-summary
// Returns the fixed 18-body-system x 7-college matrix, matching the layout
// of the official "Summary of Medical Cases" Excel template.
// Query params: dateFrom, dateTo, bodySystemId, conditionId (all optional)
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

    const { searchParams } = new URL(req.url);
    const dateFromStr  = searchParams.get("dateFrom")?.trim()     || undefined;
    const dateToStr    = searchParams.get("dateTo")?.trim()       || undefined;
    const bodySystemId = searchParams.get("bodySystemId")?.trim() || undefined;
    const conditionId  = searchParams.get("conditionId")?.trim()  || undefined;

    const dateFrom = dateFromStr ? new Date(`${dateFromStr}T00:00:00+08:00`) : undefined;
    const dateTo   = dateToStr   ? new Date(`${dateToStr}T23:59:59+08:00`)   : undefined;

    const summary = await computeMedicalCasesSummary({
      courseId, dateFrom, dateTo, bodySystemId, conditionId,
    });

    // Remap college codes (COE, CBS, ...) to their full display labels so the
    // on-screen table shows the same headings as the Excel template, with no
    // changes needed on the frontend.
    const codeToLabel = (counts: Record<string, number>) => {
      const out: Record<string, number> = {};
      COLLEGE_CODES.forEach(code => { out[COLLEGE_LABELS[code]] = counts[code] ?? 0; });
      return out;
    };

    return NextResponse.json({
      departments: COLLEGE_CODES.map(code => COLLEGE_LABELS[code]),
      bodySystems: summary.bodySystems.map(bs => ({
        id:           bs.id,
        name:         bs.letter ? `${bs.letter} ${bs.name}` : bs.name,
        countsByDept: codeToLabel(bs.countsByDept),
        total:        bs.total,
        conditions:   bs.conditions.map(c => ({
          id:           c.id,
          name:         c.name,
          countsByDept: codeToLabel(c.countsByDept),
          total:        c.total,
        })),
      })),
      grandTotal:        summary.grandTotal,
      grandCountsByDept: codeToLabel(summary.grandCountsByDept),
    });
  } catch (err) {
    console.error("[GET /medical-cases-summary]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}