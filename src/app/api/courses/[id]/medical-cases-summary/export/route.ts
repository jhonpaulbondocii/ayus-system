// src/app/api/courses/[id]/medical-cases-summary/export/route.ts
//
// Requires: npm install exceljs
// Put the uploaded template at: public/template/PMC-Medical-Cases.xlsx
//
// Query params:
//   sheet = "consolidated" | "january" | "february" | ... | "december"   (required)
//   year  = e.g. "2026"   (optional, defaults to current year — used to
//            scope which visitDate range counts toward the sheet)

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import path from "path";
import { requireCoursePermission } from "@/lib/course-access";
import { computeMedicalCasesSummary } from "@/lib/medical-cases-aggregate";
import {
  FIXED_BODY_SYSTEMS,
  COLLEGE_CODES,
  MEDICAL_CASES_TEMPLATE_PATH,
  MONTH_SHEET_NAMES,
  CONSOLIDATED_SHEET_NAME,
  TEMPLATE_COLS,
  TEMPLATE_ROWS,
} from "@/lib/medical-cases-config";

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
    const sheetParam = (searchParams.get("sheet") || "").toLowerCase();
    const yearParam  = searchParams.get("year");
    const year       = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    const isConsolidated = sheetParam === "consolidated";
    const monthIndex = MONTH_SHEET_NAMES.findIndex(m => m.toLowerCase() === sheetParam);

    if (!isConsolidated && monthIndex === -1) {
      return NextResponse.json(
        { error: "Invalid 'sheet' parameter. Use 'consolidated' or a month name (e.g. 'july')." },
        { status: 400 }
      );
    }

    // ── Determine date range for this sheet ──
    let dateFrom: Date;
    let dateTo: Date;
    if (isConsolidated) {
      dateFrom = new Date(`${year}-01-01T00:00:00+08:00`);
      dateTo   = new Date(`${year}-12-31T23:59:59+08:00`);
    } else {
      const monthNum = monthIndex + 1; // 1-based
      const lastDay  = new Date(year, monthNum, 0).getDate();
      dateFrom = new Date(`${year}-${String(monthNum).padStart(2, "0")}-01T00:00:00+08:00`);
      dateTo   = new Date(`${year}-${String(monthNum).padStart(2, "0")}-${lastDay}T23:59:59+08:00`);
    }

    const summary = await computeMedicalCasesSummary({ courseId, dateFrom, dateTo });

    // ── Load template workbook ──
    const templatePath = path.join(process.cwd(), MEDICAL_CASES_TEMPLATE_PATH);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    const sheetName = isConsolidated ? CONSOLIDATED_SHEET_NAME : MONTH_SHEET_NAMES[monthIndex];
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      return NextResponse.json({ error: `Sheet "${sheetName}" not found in template.` }, { status: 500 });
    }

    const rowLayout = isConsolidated ? TEMPLATE_ROWS.consolidated : TEMPLATE_ROWS.monthly;

    // ── Make sure the file opens directly on the sheet we just filled ──
    const sheetOrderIndex = workbook.worksheets.findIndex(ws => ws.name === sheetName);
    workbook.views = [
      { activeTab: sheetOrderIndex >= 0 ? sheetOrderIndex : 0 } as ExcelJS.WorkbookView,
    ];
    workbook.worksheets.forEach(ws => { ws.state = "visible"; });

    // ── Overwrite the stale period/year label with the actual export period ──
    const periodLabel = isConsolidated
      ? `JANUARY TO DECEMBER, ${year}`
      : `${MONTH_SHEET_NAMES[monthIndex].toUpperCase()} ${year}`;
    worksheet.getCell(rowLayout.periodLabelRow, 1).value = periodLabel;

    // Map body system name -> aggregated row from the summary
    const summaryByName = new Map(summary.bodySystems.map(bs => [bs.name, bs]));

    FIXED_BODY_SYSTEMS.forEach((def, idx) => {
      const rowNum = rowLayout.firstCategoryRow + idx;
      const row = worksheet.getRow(rowNum);
      const agg = summaryByName.get(def.name);

      COLLEGE_CODES.forEach((code, colOffset) => {
        const cell = row.getCell(TEMPLATE_COLS.firstCollege + colOffset);
        cell.value = agg ? agg.countsByDept[code] : 0;
      });
      row.getCell(TEMPLATE_COLS.total).value = agg ? agg.total : 0;
      row.commit();
    });

    // ── TOTAL row ──
    const totalRow = worksheet.getRow(rowLayout.totalRow);
    COLLEGE_CODES.forEach((code, colOffset) => {
      totalRow.getCell(TEMPLATE_COLS.firstCollege + colOffset).value = summary.grandCountsByDept[code];
    });
    totalRow.getCell(TEMPLATE_COLS.total).value = summary.grandTotal;
    totalRow.commit();

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = isConsolidated
      ? `medical-cases-summary-${year}-consolidated.xlsx`
      : `medical-cases-summary-${MONTH_SHEET_NAMES[monthIndex]}-${year}.xlsx`;

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[GET /medical-cases-summary/export]", err);
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}