// src/app/api/courses/[id]/library-cards/log-sheet/student/route.ts
// Generates filled Student Receiving Log Sheet (PSU-QSP-ULIB-001-FO004-R00)

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

// ── Calibrated from pdfplumber on FO004 (Student Receiving Log Sheet) ────────
// Page: LANDSCAPE 936 × 612 pt
// pdf-lib uses bottom-left origin → Y = PAGE_HEIGHT - top

const PAGE_WIDTH  = 936;
const PAGE_HEIGHT = 612;
const ROWS_PER_PAGE = 20;

// Column X positions and max widths (from pdfplumber header measurements)
// Columns: No. | Name | Sex (M/F) | Course/Year/Section | Date Received | Document Received | Signature | Released By
const COLS = {
  no:       { x: 14.0,  maxW: 25.0  },
  name:     { x: 45.0,  maxW: 260.0 },
  sexM:     { x: 300.0, maxW: 30.0  },
  sexF:     { x: 348.0, maxW: 30.0  },
  course:   { x: 390.0, maxW: 115.0 },
  date:     { x: 480.0, maxW: 95.0  },
  document: { x: 575.0, maxW: 120.0 },
  sig:      { x: 695.0, maxW: 100.0 },
  released: { x: 800.0, maxW: 120.0 },
};

// Row Y baselines (pdf-lib bottom-left): PAGE_HEIGHT - pdfplumber_top - 2
// pdfplumber row tops: 160.2, 180.3, 200.5, 220.6, 240.8, 260.9, 281.1, 301.2,
//   321.4, 341.5, 361.7, 381.8, 402.0, 422.1, 442.3, 462.4, 482.6, 502.7, 522.9, 543.0
const ROW_Y = [
  449.8, 429.7, 409.5, 389.4, 369.2, 349.1, 328.9, 308.8,
  288.6, 268.5, 248.3, 228.2, 208.0, 187.9, 167.7, 147.6,
  127.4, 107.3,  87.1,  67.0,
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

    // ── Fetch student records only ────────────────────────────────────────────
    const logs = await prisma.libraryReceivingLog.findMany({
      where: {
        courseId,
        request: {
          applicantType: "STUDENT",
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
    const templatePath  = path.join(process.cwd(), "public", "template", "PSU-QSP-ULIB-001-FO004-R00.pdf");
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
          // Cloudinary URL — fetch it
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
        const y     = ROW_Y[rowIdx];

        page.drawImage(img, { x: col.x, y, width: imgW, height: imgH });
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
      // Sex — checkmark in Male or Female column
      if (log.sex?.toLowerCase().startsWith("m")) {
        drawText(page, "✓", COLS.sexM.x, y, COLS.sexM.maxW);
      } else if (log.sex?.toLowerCase().startsWith("f")) {
        drawText(page, "✓", COLS.sexF.x, y, COLS.sexF.maxW);
      }
      drawText(page, log.courseYearSection ?? "",           COLS.course.x,   y, COLS.course.maxW);
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
        "Content-Disposition": `attachment; filename="student_receiving_log${suffix}.pdf"`,
      },
    });

  } catch (err) {
    console.error("[GET /library-cards/log-sheet/student]", err);
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}