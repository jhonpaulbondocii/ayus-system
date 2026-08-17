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

// ── Calibrated from pdfplumber on actual FO004 template ──────────────────────
// Page: LANDSCAPE 936 × 612 pt  (pdf-lib origin = bottom-left)

const PAGE_HEIGHT   = 612;
const ROWS_PER_PAGE = 20;
const TEXT_SIZE     = 8;
const MIN_SIZE      = 5;

function abbreviateCourse(course: string): string {
  if (!course) return "";
  // Extract abbreviation from parentheses first: "Bachelor of Science (BSIT) 2-A" → "BSIT 2-A"
  const parenMatch = course.match(/\(([^)]+)\)\s*(.*)/);
  if (parenMatch) return `${parenMatch[1]} ${parenMatch[2]}`.trim();
  // Replace common words with abbreviations
  return course
    .replace(/Bachelor of Science in /gi, "BS ")
    .replace(/Bachelor of Science/gi,    "BS")
    .replace(/Bachelor of Arts in /gi,   "BA ")
    .replace(/Bachelor of Arts/gi,       "BA")
    .replace(/Bachelor of Elementary Education/gi, "BEEd")
    .replace(/Bachelor of Secondary Education/gi,  "BSEd")
    .replace(/Bachelor of /gi,           "B")
    .replace(/Master of /gi,             "M")
    .replace(/Doctor of /gi,             "Dr.")
    .trim();
}
const ROW_H         = 20;   // height of each data row in pt
const PAD_LEFT      = 3;    // left padding inside each cell
const PAD_BOTTOM    = 5;    // baseline lift from row bottom edge

// Column definitions: x = left edge + PAD_LEFT, maxW = col width - 2*PAD_LEFT
const COLS = {
  no:       { x: 20,  maxW: 27  },
  name:     { x: 51,  maxW: 244 },
  sexM:     { x: 299, maxW: 47  },
  sexF:     { x: 350, maxW: 51  },
  course:   { x: 405, maxW: 81  },
  date:     { x: 490, maxW: 59  },
  document: { x: 553, maxW: 137 },
  sig:      { x: 694, maxW: 70  },
  released: { x: 768, maxW: 142 },
};

// Row Y baselines in pdf-lib coords (bottom-left origin)
// Formula: PAGE_HEIGHT - row_top_from_page_top - ROW_H + PAD_BOTTOM
const ROW_Y = [
  438, 418, 398, 378, 358,
  337, 317, 297, 277, 257,
  237, 216, 196, 176, 156,
  136, 116,  96,  75,  55,
];

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

    // ── Fetch student records ─────────────────────────────────────────────────
    const logs = await prisma.libraryReceivingLog.findMany({
      where: {
        courseId,
        request: { applicantType: "STUDENT" },
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
    const fontBold      = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // ── Helpers ───────────────────────────────────────────────────────────────
    function drawText(
      page: ReturnType<typeof pdfDoc.getPage>,
      text: string,
      x: number,
      y: number,
      maxW: number,
      bold = false,
    ) {
      if (!text) return;
      const f = bold ? fontBold : font;
      let fontSize = TEXT_SIZE;
      while (fontSize > MIN_SIZE && f.widthOfTextAtSize(text, fontSize) > maxW) {
        fontSize -= 0.25;
      }
      let clipped = text;
      while (clipped.length > 1 && f.widthOfTextAtSize(clipped, fontSize) > maxW) {
        clipped = clipped.slice(0, -1);
      }
      if (clipped.length < text.length && clipped.length > 1) {
        clipped = clipped.slice(0, -1) + ".";
      }
      page.drawText(clipped, { x, y, size: fontSize, font: f, color: rgb(0, 0, 0) });
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

        const img  = await embedFn(sigBytes);
        const col  = COLS.sig;
        const imgH = ROW_H - 4;
        const scale = imgH / img.height;
        const imgW  = Math.min(img.width * scale, col.maxW);
        const y     = ROW_Y[rowIdx] - 1;

        page.drawImage(img, { x: col.x, y, width: imgW, height: imgH });
      } catch {
        // skip
      }
    }

    // ── Fill pages ────────────────────────────────────────────────────────────
    let pageIdx   = 0;
    let rowOnPage = 0;

    for (let i = 0; i < logs.length; i++) {
      // Add new page copy of template when current page is full
      if (rowOnPage >= ROWS_PER_PAGE) {
        const [tpl] = await pdfDoc.copyPages(pdfDoc, [0]);
        pdfDoc.addPage(tpl);
        pageIdx++;
        rowOnPage = 0;
      }

      const log  = logs[i];
      const page = pdfDoc.getPage(pageIdx);
      const y    = ROW_Y[rowOnPage];
      const rowNo = pageIdx * ROWS_PER_PAGE + rowOnPage + 1;

      drawText(page, log.name,                     COLS.name.x,     y, COLS.name.maxW);

      // Sex — "/" in Male or Female column
      if (log.sex?.toLowerCase().startsWith("m")) {
        drawText(page, "/", COLS.sexM.x + 10, y, COLS.sexM.maxW, true);
      } else if (log.sex?.toLowerCase().startsWith("f")) {
        drawText(page, "/", COLS.sexF.x + 10, y, COLS.sexF.maxW, true);
      }

      drawText(page, abbreviateCourse(log.courseYearSection ?? ""),  COLS.course.x,   y, COLS.course.maxW);
      drawText(page, fmtDate(log.dateReceived),    COLS.date.x,     y, COLS.date.maxW);
      drawText(page, log.documentReceived,         COLS.document.x, y, COLS.document.maxW);
      await drawSignature(page, log.signatureUrl,  rowOnPage);
      drawText(page, log.releasedBy ?? "",         COLS.released.x, y, COLS.released.maxW);

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