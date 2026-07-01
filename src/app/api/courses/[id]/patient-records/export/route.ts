import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";

function fmtDate(d: Date | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtTime(d: Date | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function courseAbbrev(course: string | null | undefined): string {
  if (!course) return "";
  const match = course.match(/\(([^)]+)\)/);
  return match ? match[1] : course;
}

function computeAge(birthDate: Date | null | undefined, fallbackAge: number | null | undefined): string {
  if (birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return String(age);
  }
  if (fallbackAge != null) return String(fallbackAge);
  return "";
}

// Legal landscape = 1008 x 612 pts
// pdf-lib origin is bottom-left
// Measured from the actual template PDF
const PAGE_HEIGHT = 612;

const COLS = [
  { x: 28,  w: 74  }, // DATE/TIME
  { x: 102, w: 22  }, // NO.
  { x: 124, w: 194 }, // NAME
  { x: 318, w: 27  }, // SEX
  { x: 345, w: 27  }, // AGE
  { x: 372, w: 160 }, // ADDRESS
  { x: 532, w: 120 }, // COURSE/YR. & SEC.
  { x: 652, w: 193 }, // CHIEF COMPLAINT
  { x: 845, w: 63  }, // SIGNATURE
];

// From top of page: header ends ~175pt from top
// First data row starts at ~185pt from top
// Row height ~14pt
// Convert to pdf-lib bottom coords: y = PAGE_HEIGHT - y_from_top
const FIRST_ROW_Y_FROM_TOP = 169;// first row top edge from page top (pdfplumber measured)
const ROW_HEIGHT  = 14;
const MIN_ROWS    = 25;
const TEXT_SIZE     = 7;
const MIN_TEXT_SIZE = 4.5;
const TEXT_PADDING_LEFT   = 2;
const TEXT_PADDING_BOTTOM = 3;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo   = searchParams.get("dateTo");
    const course   = searchParams.get("course");

    // ── Fetch records ──
    const records = await prisma.patientRecord.findMany({
      where: {
        courseId,
        ...(dateFrom || dateTo ? {
          visitDate: {
            ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00+08:00`) } : {}),
        ...(dateTo   ? { lte: new Date(`${dateTo}T23:59:59+08:00`)   } : {}),
          },
        } : {}),
        ...(course ? { student: { course } } : {}),
      },
      include: {
  student: {
    select: {
      id:            true,
      studentNumber: true,
      name:          true,
      email:         true,
      address:       true,
      birthDate:     true,
      age:           true,
      gender:        true,
      course:        true,
    }
  }
},
      orderBy: { visitDate: "asc" },
    });

    // ── Load template PDF ──
    const templatePath = path.join(process.cwd(), "public", "template", "GENERAL-LOG-SHEET-2025.pdf");
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });

    const pages = pdfDoc.getPages();
    const page  = pages[0];
    page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // ── Write data rows ──
    Math.max(records.length, MIN_ROWS); // ensures MIN_ROWS rows exist (loop uses records.length)

    for (let i = 0; i < records.length; i++) {
      const r = records[i];

      // Convert from top-of-page to pdf-lib bottom-origin
      const rowTopFromTop = FIRST_ROW_Y_FROM_TOP + i * ROW_HEIGHT;
const rowY = PAGE_HEIGHT - rowTopFromTop - ROW_HEIGHT + TEXT_PADDING_BOTTOM;
// Guard: skip rows that fall outside the table area
if (rowY < 0) continue;

      const cells = [
        `${fmtDate(r.visitDate)} ${fmtTime(r.visitDate)}`,
        String(i + 1),
        r.student.name,
        r.student.gender ?? "",
        computeAge(r.student.birthDate, r.student.age),
        r.student.address ?? "",
        r.student.course ?? "",
        r.complaint,
        "",
      ];

      for (let c = 0; c < cells.length; c++) {
  const col  = COLS[c];
  const text = cells[c];
  if (!text) continue;

  const maxTextWidth = col.w - TEXT_PADDING_LEFT * 2;

  // First try shrinking font size down to MIN_TEXT_SIZE before truncating
  let fontSize = TEXT_SIZE;
  while (
    fontSize > MIN_TEXT_SIZE &&
    font.widthOfTextAtSize(text, fontSize) > maxTextWidth
  ) {
    fontSize -= 0.5;
  }

  // If still too wide even at min size, truncate
  let clipped = text;
  while (
    clipped.length > 1 &&
    font.widthOfTextAtSize(clipped, fontSize) > maxTextWidth
  ) {
    clipped = clipped.slice(0, -1);
  }

  page.drawText(clipped, {
    x:    col.x + TEXT_PADDING_LEFT,
    y:    rowY,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  });
}

      // Draw signature image if available
      if (r.signatureUrl && r.signatureUrl.startsWith("data:image/png;base64,")) {
  try {
    const base64Data = r.signatureUrl.replace("data:image/png;base64,", "");
    const sigBytes   = Buffer.from(base64Data, "base64");
    const sigImage   = await pdfDoc.embedPng(sigBytes);
    const sigCol     = COLS[8];

    // Use most of the row height for the signature, keep 1px margin top+bottom
    const sigH = ROW_HEIGHT - 2;
    const sigW = Math.min(
      sigImage.width * (sigH / sigImage.height),
      sigCol.w - TEXT_PADDING_LEFT * 2
    );

    // Center vertically within the row
    const sigY = PAGE_HEIGHT - rowTopFromTop - ROW_HEIGHT + Math.floor((ROW_HEIGHT - sigH) / 2);

    page.drawImage(sigImage, {
      x:      sigCol.x + TEXT_PADDING_LEFT,
      y:      sigY,
      width:  sigW,
      height: sigH,
    });
  } catch {
    // skip if signature can't be embedded
  }
}
    }

    // ── Save & return ──
    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="general_log_sheet.pdf"`,
      },
    });

  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}