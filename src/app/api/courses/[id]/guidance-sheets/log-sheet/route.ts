// src/app/api/courses/[id]/guidance-sheets/log-sheet/route.ts
// Generates a filled PDF log sheet (PSU-QSP-GTC-002-FO013-R00) from GuidanceInfoSheet records

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

// ── Calibrated from pdfplumber measurements on the actual template ──────────
// Page is LANDSCAPE: 792 × 612 pt
// All coordinates are in pdf-lib's bottom-left origin system.

const PAGE_WIDTH  = 792;
const PAGE_HEIGHT = 612;
const ROWS_PER_PAGE = 20;

// X start and max-width for each column (6 columns)
const COLS = [
  { x: 40.9,  maxW: 54.7  }, // Date
  { x: 101.6, maxW: 220.7 }, // Complete Name
  { x: 328.3, maxW: 177.5 }, // Department/Office/Course
  { x: 511.8, maxW: 45.8  }, // Sex
  { x: 563.6, maxW: 84.9  }, // Purpose
  { x: 654.5, maxW: 96.7  }, // Signature
];

// Y position (text baseline) for each of the 20 data rows, row 0 = first data row
const ROW_Y = [
  453.3, 433.0, 413.5, 393.2, 373.7, 353.4, 332.7, 312.4, 291.7, 271.4,
  250.7, 230.4, 209.7, 189.4, 168.7, 148.4, 127.7, 107.3,  86.7,  66.3,
];

const ROW_HEIGHT = 20; // average row height, used for image placement

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
    const dateFrom = searchParams.get("dateFrom");
    const dateTo   = searchParams.get("dateTo");
    const program  = searchParams.get("course");

    // ── Fetch records ────────────────────────────────────────────────────────
    const sheets = await prisma.guidanceLogEntry.findMany({
      where: {
        courseId,
        ...(dateFrom || dateTo ? {
          visitDate: {
            ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00+08:00`) } : {}),
            ...(dateTo   ? { lte: new Date(`${dateTo}T23:59:59+08:00`)   } : {}),
          },
        } : {}),
        ...(program ? { department: program } : {}),
      },
      orderBy: { visitDate: "asc" },
    });

    // ── Load template ────────────────────────────────────────────────────────
    const templatePath  = path.join(process.cwd(), "public", "template", "PSU-QSP-GTC-002-FO013-R00.pdf");
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc        = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
    const font          = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const TEXT_SIZE = 7;
    const MIN_SIZE  = 4.5;

    // ── Helper: draw clipped text in a cell ─────────────────────────────────
    function drawCell(
      page: ReturnType<typeof pdfDoc.getPage>,
      text: string,
      colIdx: number,
      rowIdx: number,
    ) {
      if (!text) return;
      const col  = COLS[colIdx];
      let fontSize = TEXT_SIZE;

      // Shrink font until text fits within maxW
      while (fontSize > MIN_SIZE && font.widthOfTextAtSize(text, fontSize) > col.maxW) {
        fontSize -= 0.25;
      }

      // Hard-clip: truncate characters until it fits
      let clipped = text;
      while (clipped.length > 1 && font.widthOfTextAtSize(clipped, fontSize) > col.maxW) {
        clipped = clipped.slice(0, -1);
      }

      page.drawText(clipped, {
        x:    col.x,
        y:    ROW_Y[rowIdx],
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    }

    // ── Helper: draw signature image in a cell ───────────────────────────────
    async function drawSignature(
      page: ReturnType<typeof pdfDoc.getPage>,
      signatureUrl: string | null,
      rowIdx: number,
    ) {
      if (!signatureUrl) return;

      try {
        let sigBytes: Uint8Array;
        let embedFn: typeof pdfDoc.embedPng | typeof pdfDoc.embedJpg;

        if (signatureUrl.startsWith("data:image/png;base64,")) {
          const b64 = signatureUrl.replace("data:image/png;base64,", "");
          sigBytes  = Buffer.from(b64, "base64");
          embedFn   = pdfDoc.embedPng.bind(pdfDoc);
        } else if (signatureUrl.startsWith("data:image/jpeg;base64,") || signatureUrl.startsWith("data:image/jpg;base64,")) {
          const b64 = signatureUrl.replace(/^data:image\/(jpeg|jpg);base64,/, "");
          sigBytes  = Buffer.from(b64, "base64");
          embedFn   = pdfDoc.embedJpg.bind(pdfDoc);
        } else {
          return; // unsupported format
        }

        const img   = await embedFn(sigBytes);
        const col   = COLS[5];
        const imgH  = ROW_HEIGHT - 4;
        const scale = imgH / img.height;
        const imgW  = Math.min(img.width * scale, col.maxW);
        const textY = ROW_Y[rowIdx];

        page.drawImage(img, {
          x:      col.x,
          y:      textY,
          width:  imgW,
          height: imgH,
        });
      } catch {
        // Skip if image fails to embed
      }
    }

    // ── Fill pages ───────────────────────────────────────────────────────────
    // Template already has 1 page; we reuse it for the first page,
    // and copy it for additional pages.

    let pageIdx   = 0;
    let rowOnPage = 0;

    for (let i = 0; i < sheets.length; i++) {
      if (rowOnPage >= ROWS_PER_PAGE) {
        // Copy the blank template page and append it
        const [tpl] = await pdfDoc.copyPages(pdfDoc, [0]);
        pdfDoc.addPage(tpl);
        pageIdx++;
        rowOnPage = 0;
      }

      const s    = sheets[i];
      const page = pdfDoc.getPage(pageIdx);

      drawCell(page, fmtDate(s.visitDate),      0, rowOnPage);
      drawCell(page, s.name,                    1, rowOnPage);
      drawCell(page, s.department ?? "",        2, rowOnPage);
      drawCell(page, s.sex ?? "",               3, rowOnPage);
      drawCell(page, s.purpose,                 4, rowOnPage);
      await drawSignature(page, s.signatureUrl, rowOnPage);

      rowOnPage++;
    }

    // ── Return PDF ───────────────────────────────────────────────────────────
    const pdfBytes = await pdfDoc.save();

    const suffix = dateFrom || dateTo
      ? `_${dateFrom || "start"}_to_${dateTo || "now"}`
      : "";

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="guidance_log_sheet${suffix}.pdf"`,
      },
    });

  } catch (err) {
    console.error("[GET /guidance-sheets/log-sheet]", err);
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}