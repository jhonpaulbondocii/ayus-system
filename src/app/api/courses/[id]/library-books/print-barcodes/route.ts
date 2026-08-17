import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

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
    const category      = searchParams.get("category")     ?? "";
    const accessionNos  = searchParams.get("accessionNos") ?? "";
    const accessionList = accessionNos ? accessionNos.split(",").map(s => s.trim()).filter(Boolean) : [];

    const books = await prisma.libraryBook.findMany({
      where: {
        courseId,
        ...(accessionList.length > 0
          ? { accessionNo: { in: accessionList } }
          : category ? { category } : {}),
      },
      orderBy: { accessionNo: "asc" },
      select: { id: true, accessionNo: true, title: true, category: true },
    });

    if (books.length === 0) {
      return NextResponse.json({ error: "No books found." }, { status: 404 });
    }

    // ── PDF setup ─────────────────────────────────────────────────────────────
    // A4: 595 x 842 pt
    const pdfDoc  = await PDFDocument.create();
    const fontB   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const PAGE_W  = 595;
    const PAGE_H  = 842;
    const COLS    = 3;
    const ROWS    = 8;
    const MARGIN  = 24;   // page margin pt
    const GAP     = 8;    // gap between labels pt

    const labelW  = (PAGE_W - MARGIN * 2 - GAP * (COLS - 1)) / COLS;  // ≈ 175 pt
    const labelH  = (PAGE_H - MARGIN * 2 - GAP * (ROWS - 1)) / ROWS;  // ≈ 99 pt

    const bwipjs  = await import("bwip-js");

    let page      = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let bookIndex = 0;

    for (const book of books) {
      const col   = bookIndex % COLS;
      const row   = Math.floor(bookIndex / COLS) % ROWS;

      // New page when needed
      if (bookIndex > 0 && bookIndex % (COLS * ROWS) === 0) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      }

      const x     = MARGIN + col * (labelW + GAP);
      // pdf-lib origin is bottom-left; row 0 = top
      const y     = PAGE_H - MARGIN - (row + 1) * labelH - row * GAP;

      // ── Label border ──────────────────────────────────────────────────────
      page.drawRectangle({
        x, y: y + labelH * 0.28, width: labelW, height: labelH * 0.72,
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 0.5,
        color: rgb(1, 1, 1),
      });

      // ── Barcode ───────────────────────────────────────────────────────────
      try {
        const boxTop    = y + labelH;               // top of box
        const boxInnerH = labelH * 0.72;
        const barcodeH  = boxInnerH * 0.70;
        const padX      = 8;
        const barcodeW  = labelW - padX * 2;

        const buf = await bwipjs.toBuffer({
          bcid:            "code128",
          text:            book.accessionNo,
          scale:           3,
          height:          12,
          includetext:     false,
          paddingwidth:    0,
          paddingheight:   0,
          backgroundcolor: "ffffff",
        });

        const img = await pdfDoc.embedPng(buf);
        page.drawImage(img, {
          x:      x + padX,
          y:      boxTop - barcodeH - 6,
          width:  barcodeW,
          height: barcodeH,
        });

        // ── Accession No. below barcode, inside box ────────────────────────
        const accText = book.accessionNo;
        let   accSize = 10;
        while (accSize > 6 && fontB.widthOfTextAtSize(accText, accSize) > labelW - 16) accSize -= 0.5;
        page.drawText(accText, {
          x:    x + labelW / 2 - fontB.widthOfTextAtSize(accText, accSize) / 2,
          y:    boxTop - barcodeH - 6 - accSize - 1,
          size: accSize,
          font: fontB,
          color: rgb(0, 0, 0),
        });
      } catch { /* skip if fail */ }

      // ── Title outside box (below border) ──────────────────────────────────
      let   title     = book.title;
      const titleSize = 7;
      const maxTitleW = labelW - 8;
      while (title.length > 1 && fontB.widthOfTextAtSize(title, titleSize) > maxTitleW) {
        title = title.slice(0, -1);
      }
      if (title.length < book.title.length) title = title.slice(0, -1) + "…";
      page.drawText(title, {
        x:    x + 4,
        y:    y + labelH * 0.18,
        size: titleSize,
        font: fontB,
        color: rgb(0.2, 0.2, 0.2),
      });

      // ── Category outside box ───────────────────────────────────────────────
      const catText = book.category;
      let   catSize = 6.5;
      while (catSize > 5 && fontB.widthOfTextAtSize(catText, catSize) > maxTitleW) catSize -= 0.5;
      page.drawText(catText, {
        x:    x + 4,
        y:    y + labelH * 0.07,
        size: catSize,
        font: fontB,
        color: rgb(0.5, 0.5, 0.5),
      });


      bookIndex++;
    }

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `inline; filename="barcodes.pdf"`,
      },
    });

  } catch (err) {
    console.error("[print-barcodes]", err);
    return NextResponse.json({ error: "Failed to generate." }, { status: 500 });
  }
}