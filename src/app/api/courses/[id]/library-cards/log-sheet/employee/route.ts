// src/app/api/courses/[id]/library-cards/log-sheet/employee/route.ts
// Generates filled Employee Receiving Log Sheet (PSU-QSP-ULIB-001-FO005-R00)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ── Calibrated from pdfplumber on FO005 (Employee Receiving Log Sheet) ───────
// Page: LANDSCAPE 936 × 612 pt
// Employee template has an extra "Position" column vs Student

const PAGE_WIDTH  = 936;
const PAGE_HEIGHT = 612;
const ROWS_PER_PAGE = 20;

// Column X positions — Employee has: No | Name | Sex M/F | College/Dept | Position | Date | Document | Signature | Released By
const COLS = {
  no:       { x: 14.0,  maxW: 22.0  },
  name:     { x: 40.0,  maxW: 230.0 },
  sexM:     { x: 272.0, maxW: 28.0  },
  sexF:     { x: 314.0, maxW: 28.0  },
  college:  { x: 355.0, maxW: 100.0 },
  position: { x: 458.0, maxW: 80.0  },
  date:     { x: 530.0, maxW: 90.0  },
  document: { x: 622.0, maxW: 95.0  },
  sig:      { x: 720.0, maxW: 88.0  },
  released: { x: 812.0, maxW: 108.0 },
};

// Row Y baselines (pdf-lib bottom-left): PAGE_HEIGHT - pdfplumber_top - 2
// pdfplumber row tops: 160.3, 180.5, 200.7, 220.9, 241.1, 261.3, 281.5, 301.7,
//   321.9, 342.1, 362.3, 382.5, 402.7, 422.9, 443.1, 463.3, 483.5, 503.7, 523.9, 544.1
const ROW_Y = [
  449.7, 429.5, 409.3, 389.1, 368.9, 348.7, 328.5, 308.3,
  288.1, 267.9, 247.7, 227.5, 207.3, 187.1, 166.9, 146.7,
  126.5, 106.3,  86.1,  65.9,
];

const ROW_HEIGHT = 18;
const TEXT_SIZE  = 7;
const MIN_SIZE   = 4.5;

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

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { officeType: true },
    });
    if (course?.officeType?.toUpperCase() !== "LIBRARY") {
      return NextResponse.json({ error: "Not a library office" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo   = searchParams.get("dateTo");

    // ── Fetch employee records only ───────────────────────────────────────────
    const logs = await prisma.libraryReceivingLog.findMany({
      where: {
        courseId,
        request: {
          applicantType: "EMPLOYEE",
        },
        ...(dateFrom || dateTo ? {
          dateReceived: {
            ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00+08:00`) } : {}),
            ...(dateTo   ? { lte: new Date(`${dateTo}T23:59:59+08:00`)   } : {}),
          },
        } : {}),
      },
      include: { request: true },
      orderBy: { dateReceived: "asc" },
    });

    // ── Load template ─────────────────────────────────────────────────────────
    const templatePath  = path.join(process.cwd(), "public", "template", "PSU-QSP-ULIB-001-FO005-R00.pdf");
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc        = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
    const font          = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // ── Helpers ───────────────────────────────────────────────────────────────
    function drawText(
      page: ReturnType<typeof pdfDoc.getPage>,
      text: string,
      x: number,
      y: number,
      maxW: number,
    ) {
      if (!text) return;
      let fontSize = TEXT_SIZE;
      while (fontSize > MIN_SIZE && font.widthOfTextAtSize(text, fontSize) > maxW) {
        fontSize -= 0.25;
      }
      let clipped = text;
      while (clipped.length > 1 && font.widthOfTextAtSize(clipped, fontSize) > maxW) {
        clipped = clipped.slice(0, -1);
      }
      page.drawText(clipped, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
    }

    async function drawSignature(
      page: ReturnType<typeof pdfDoc.getPage>,
      signatureUrl: string | null | undefined,
      rowIdx: number,
    ) {
      if (!signatureUrl) return;
      try {
        let sigBytes: Uint8Array;
        let embedFn: typeof pdfDoc.embedPng | typeof pdfDoc.embedJpg;

        if (signatureUrl.startsWith("data:image/png;base64,")) {
          sigBytes = Buffer.from(signatureUrl.replace("data:image/png;base64,", ""), "base64");
          embedFn  = pdfDoc.embedPng.bind(pdfDoc);
        } else if (/^data:image\/(jpeg|jpg);base64,/.test(signatureUrl)) {
          sigBytes = Buffer.from(signatureUrl.replace(/^data:image\/(jpeg|jpg);base64,/, ""), "base64");
          embedFn  = pdfDoc.embedJpg.bind(pdfDoc);
        } else if (signatureUrl.startsWith("http")) {
          const res = await fetch(signatureUrl);
          const buf = await res.arrayBuffer();
          sigBytes  = new Uint8Array(buf);
          embedFn   = signatureUrl.includes(".png") ? pdfDoc.embedPng.bind(pdfDoc) : pdfDoc.embedJpg.bind(pdfDoc);
        } else {
          return;
        }

        const img   = await embedFn(sigBytes);
        const col   = COLS.sig;
        const imgH  = ROW_HEIGHT - 2;
        const scale = imgH / img.height;
        const imgW  = Math.min(img.width * scale, col.maxW);

        page.drawImage(img, {
          x:      col.x,
          y:      ROW_Y[rowIdx],
          width:  imgW,
          height: imgH,
        });
      } catch {
        // Skip if image fails
      }
    }

    // ── Fill pages ────────────────────────────────────────────────────────────
    let pageIdx   = 0;
    let rowOnPage = 0;

    for (let i = 0; i < logs.length; i++) {
      if (rowOnPage >= ROWS_PER_PAGE) {
        const [tpl] = await pdfDoc.copyPages(pdfDoc, [0]);
        pdfDoc.addPage(tpl);
        pageIdx++;
        rowOnPage = 0;
      }

      const log  = logs[i];
      const page = pdfDoc.getPage(pageIdx);
      const y    = ROW_Y[rowOnPage];
      const rowNo = (pageIdx * ROWS_PER_PAGE) + rowOnPage + 1;

      drawText(page, String(rowNo),                         COLS.no.x,       y, COLS.no.maxW);
      drawText(page, log.name,                              COLS.name.x,     y, COLS.name.maxW);
      if (log.sex?.toLowerCase().startsWith("m")) {
        drawText(page, "✓", COLS.sexM.x, y, COLS.sexM.maxW);
      } else if (log.sex?.toLowerCase().startsWith("f")) {
        drawText(page, "✓", COLS.sexF.x, y, COLS.sexF.maxW);
      }
      drawText(page, log.collegeDept ?? "",                 COLS.college.x,  y, COLS.college.maxW);
      drawText(page, log.position ?? "",                    COLS.position.x, y, COLS.position.maxW);
      drawText(page, fmtDate(log.dateReceived),             COLS.date.x,     y, COLS.date.maxW);
      drawText(page, log.documentReceived,                  COLS.document.x, y, COLS.document.maxW);
      await drawSignature(page, log.signatureUrl,           rowOnPage);
      drawText(page, log.releasedBy ?? "",                  COLS.released.x, y, COLS.released.maxW);

      rowOnPage++;
    }

    // ── Return PDF ────────────────────────────────────────────────────────────
    const pdfBytes = await pdfDoc.save();
    const suffix   = dateFrom || dateTo
      ? `_${dateFrom ?? "start"}_to_${dateTo ?? "now"}`
      : "";

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="employee_receiving_log${suffix}.pdf"`,
      },
    });

  } catch (err) {
    console.error("[GET /library-cards/log-sheet/employee]", err);
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}