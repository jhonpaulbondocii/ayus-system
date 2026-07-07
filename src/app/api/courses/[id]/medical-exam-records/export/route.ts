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

function computeAge(birthDate: Date | null | undefined, fallbackAge: number | null | undefined): string {
  if (birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return String(age);
  }
  if (fallbackAge != null) return String(fallbackAge);
  return "";
}

// Page: 936 x 612 pts (legal landscape)
// pdf-lib origin is bottom-left, so y = PAGE_HEIGHT - y_from_top
const PAGE_HEIGHT = 612;

// Exact column positions measured from MEDICAL-EXAMINATION-RECORD-2025.pdf
const COLS = [
  { x: 25.9,  w: 72.9  }, // DATE/TIME
  { x: 98.8,  w: 20.8  }, // NO.
  { x: 119.6, w: 189.7 }, // NAME
  { x: 309.3, w: 26.8  }, // SEX
  { x: 336.1, w: 26.0  }, // AGE
  { x: 362.1, w: 157.0 }, // COURSE/YR. & SEC.
  { x: 519.1, w: 181.6 }, // PURPOSE
  { x: 700.7, w: 145.8 }, // REMARKS
  { x: 846.5, w: 61.8  }, // SIGNATURE
];

const FIRST_ROW_Y_FROM_TOP = 180.3; // first data row top edge (measured)
const ROW_HEIGHT            = 13.5; // each data row height (measured)
const TEXT_SIZE             = 7;
const MIN_TEXT_SIZE         = 4.5;
const TEXT_PADDING_LEFT     = 2;
const TEXT_PADDING_BOTTOM   = 3;

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
    const records = await prisma.medicalExamRecord.findMany({
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
            address:       true,
            birthDate:     true,
            age:           true,
            gender:        true,
            course:        true,
          },
        },
      },
      orderBy: { visitDate: "asc" },
    });

    // ── Load template PDF ──
    const templatePath  = path.join(process.cwd(), "public", "template", "MEDICAL-EXAMINATION-RECORD-2025.pdf");
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc        = await PDFDocument.load(templateBytes, { ignoreEncryption: true });

    const pages = pdfDoc.getPages();
    const page  = pages[0];
    const font  = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // ── Write data rows ──
    for (let i = 0; i < records.length; i++) {
      const r = records[i];

      // Convert from top-of-page to pdf-lib bottom-origin
      const rowTopFromTop = FIRST_ROW_Y_FROM_TOP + i * ROW_HEIGHT;
      const rowY = PAGE_HEIGHT - rowTopFromTop - ROW_HEIGHT + TEXT_PADDING_BOTTOM;

      // Guard: skip rows that fall outside the table area
      if (rowY < 40) continue;

       const cells = [
        `${fmtDate(r.visitDate)} ${fmtTime(r.visitDate)}`,
        String(i + 1),
        r.student.name,
        r.student.gender ?? "",
        computeAge(r.student.birthDate, r.student.age),
        [r.student.course, r.section].filter(Boolean).join(" — "),
        r.purpose,
        r.remarks ?? "",
        "", // signature handled separately below
      ];

      for (let c = 0; c < cells.length; c++) {
        const col  = COLS[c];
        const text = cells[c];
        if (!text) continue;

        const maxTextWidth = col.w - TEXT_PADDING_LEFT * 2;

        // Shrink font size first, then truncate if still too wide
        let fontSize = TEXT_SIZE;
        while (fontSize > MIN_TEXT_SIZE && font.widthOfTextAtSize(text, fontSize) > maxTextWidth) {
          fontSize -= 0.5;
        }

        let clipped = text;
        while (clipped.length > 1 && font.widthOfTextAtSize(clipped, fontSize) > maxTextWidth) {
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

          const sigH = ROW_HEIGHT - 2;
          const sigW = Math.min(
            sigImage.width * (sigH / sigImage.height),
            sigCol.w - TEXT_PADDING_LEFT * 2
          );
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
        "Content-Disposition": `attachment; filename="medical_exam_record.pdf"`,
      },
    });

  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}