// src/app/api/courses/[id]/library-cards/[requestId]/affidavit/route.ts
// Generates a pre-filled Affidavit of Lost PDF (PSU-QSP-ULIB-001-FO006-R00)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";

// Page: 612.1 x 936.1 pt (portrait)
// pdf-lib uses bottom-left origin → y_pdfl = 936.1 - pymupdf_y0

const PAGE_H = 936.1;

// Fields to fill (x, yTop in pymupdf coords, converted to pdf-lib on draw)
// "I ___..." line: name goes after "I " at x≈80, y0=177.3
// "a resident of ___" line: address goes after "a resident of " at x≈172, y0=196.7
// Item 1) student ID number: after long underscore, x≈430, y0=254.7
// Item 2) where card was kept: after "in my " x≈310, y0=293.4
// Item 3) date discovered: after "sometime on " x≈220, y0=332.1
// Item 3) where card was: after "no longer in my " x≈260, y0=351.4
// IN WITNESS WHEREOF: day/month/year at specific x positions, y0=584.9

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const { id: courseId, requestId } = await params;

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

    const request = await prisma.libraryCardRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.courseId !== courseId) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (request.cardType !== "LOST") {
      return NextResponse.json({ error: "Affidavit only for lost card requests" }, { status: 400 });
    }

    // ── Load template ─────────────────────────────────────────────────────────
    const templatePath  = path.join(process.cwd(), "public", "template", "PSU-QSP-ULIB-001-FO006-R00.pdf");
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc        = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
    const font          = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const page = pdfDoc.getPage(0);

    // ── Helper ────────────────────────────────────────────────────────────────
    function drawText(
      text: string,
      x: number,
      yTop: number,   // pymupdf top origin
      size = 10.5,
      maxW = 999,
    ) {
      if (!text) return;
      let fontSize = size;
      while (fontSize > 6 && font.widthOfTextAtSize(text, fontSize) > maxW) {
        fontSize -= 0.25;
      }
      let clipped = text;
      while (clipped.length > 1 && font.widthOfTextAtSize(clipped, fontSize) > maxW) {
        clipped = clipped.slice(0, -1);
      }
      page.drawText(clipped, {
        x,
        y: PAGE_H - yTop,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    }

    // ── Date helpers ──────────────────────────────────────────────────────────
    const now   = new Date();
    const day   = String(now.getDate());
    const month = now.toLocaleDateString("en-US", { month: "long" });
    const year  = String(now.getFullYear());

    const MONTHS = ["January","February","March","April","May","June",
                    "July","August","September","October","November","December"];

    // ── Fill fields ───────────────────────────────────────────────────────────

    // Line 1: "I ___name___, a student of..."
    // "I " ends around x=81. Name field spans the underline.
    // Underline starts ~x=81, ends ~x=355 → maxW ≈ 274
    drawText(request.name,         81, 183, 10.5, 274);

    // Line 2: "a resident of ___address___"
    // "a resident of " ends around x=172. Underline to ~x=520 → maxW ≈ 348
    drawText(request.address ?? "", 172, 202, 10.5, 348);

    // Item 1: student ID number after "bearing my student I.D. number ___"
    // Underline starts ~x=432, ends ~x=530 → maxW ≈ 98
    drawText(request.studentNo ?? "", 432, 260, 10.5, 95);

    // Item 2: where card was kept — left blank (student fills in manually)
    // Only fill if reason is provided
    if (request.reason) {
      // "in my ___" starts ~x=310, ends ~x=535 → maxW ≈ 225
      drawText(request.reason, 310, 299, 10.5, 220);
    }

    // Item 3 line 1: date discovered — leave blank for student to fill
    // Item 3 line 2: where card was — leave blank for student to fill
    // (These are typically handwritten by the student)

    // IN WITNESS WHEREOF date: "...this _day_ day of _month_, _year_"
    // "this " ends ~x=430. Day at ~x=432, maxW=30
    // "day of " — month at ~x=493, maxW=55
    // ", " — year at ~x=555, maxW=38
    drawText(day,   432, 591, 10.5, 28);
    drawText(month, 493, 591, 10.5, 52);
    drawText(year,  552, 591, 10.5, 36);

    // ── Campus line (underline before "Campus") ───────────────────────────────
    // From template visual, campus underline is around y0=72, x=169
    // Leave blank — staff fills in campus name on the printed copy

    // ── Return PDF ────────────────────────────────────────────────────────────
    const pdfBytes = await pdfDoc.save();
    const safeName = request.name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="affidavit_${safeName}.pdf"`,
      },
    });

  } catch (err) {
    console.error("[GET /library-cards/affidavit]", err);
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}