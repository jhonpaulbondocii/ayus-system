// src/app/api/courses/[id]/library-cards/[requestId]/export-card/route.ts
// Generates a filled Student Library Card PDF (PSU-QSP-ULIB-001-FO002-R00)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";

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

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (request.applicantType !== "STUDENT") {
      return NextResponse.json({ error: "This template is for students only" }, { status: 400 });
    }

    // Campus and Card No. passed as query params (staff fills these in the UI)
    const { searchParams } = new URL(req.url);
    const campus       = searchParams.get("campus")       ?? "";
    const cardNo       = searchParams.get("cardNo")       ?? "";
    const librarian    = searchParams.get("librarian")    ?? "";
    const librarianSig = searchParams.get("librarianSig") ?? "";

    // ── Load template ─────────────────────────────────────────────────────────
    const templatePath  = path.join(process.cwd(), "public", "template", "PSU-QSP-ULIB-001-FO002-R00.pdf");
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc        = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
    const font          = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold      = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const page       = pdfDoc.getPage(0);
    const { height } = page.getSize(); // 612.1 x 936.1 pt

    // ── Coordinate system ─────────────────────────────────────────────────────
    // The card front is a raster image embedded at:
    //   bbox (PyMuPDF/top-left): x0=156.6, y0=83.5, x1=455.4, y1=281.3
    //   image size: 912 × 603 px  →  scale: 0.3276 pt/px (x), 0.3280 pt/px (y)
    //
    // All coordinates below are in pdf-lib space (origin = bottom-left of page).
    //   pdf_lib_y = page_height − pymupdf_y_from_top
    //
    // drawText / drawCenteredText accept `yTop` = distance from page TOP (= pymupdf y),
    // then internally convert: pdf_lib_y = height − yTop  (this lands at the text baseline).

    function drawText(
      text: string,
      x: number,
      yTop: number,   // distance from page TOP = text baseline in pymupdf coords
      size: number,
      maxW: number,
      bold = false,
    ) {
      if (!text) return;
      const f = bold ? fontBold : font;
      let fontSize = size;
      while (fontSize > 4 && f.widthOfTextAtSize(text, fontSize) > maxW) fontSize -= 0.25;
      let clipped = text;
      while (clipped.length > 1 && f.widthOfTextAtSize(clipped, fontSize) > maxW) clipped = clipped.slice(0, -1);
      page.drawText(clipped, { x, y: height - yTop, size: fontSize, font: f, color: rgb(0, 0, 0) });
    }

    function drawCenteredText(
      text: string,
      boxX: number,
      maxW: number,
      yTop: number,
      size: number,
      bold = false,
    ) {
      if (!text) return;
      const f = bold ? fontBold : font;
      let fontSize = size;
      while (fontSize > 4 && f.widthOfTextAtSize(text, fontSize) > maxW) fontSize -= 0.25;
      const textW     = f.widthOfTextAtSize(text, fontSize);
      const centeredX = boxX + (maxW - textW) / 2;
      page.drawText(text, { x: centeredX, y: height - yTop, size: fontSize, font: f, color: rgb(0, 0, 0) });
    }

    // ── Fill fields ───────────────────────────────────────────────────────────

    // Campus — top-centre of card
    drawText(campus, 265.6, 135.5, 8, 53.5);

    // Card No. — overlays the "00000" placeholder.
    //   Shifted right by ~10pt so text lands squarely over the "00000" digits.
    drawCenteredText(cardNo, 363.2, 71.7, 141.9, 12, true);

    // Name
    drawText(request.name, 295.6, 169.7, 8, 138.5);

    // Address — split into two lines if long
    const addr      = request.address ?? "";
    const midpoint  = Math.floor(addr.length / 2);
    const spaceNear = addr.lastIndexOf(" ", midpoint);
    const split     = spaceNear > 0 && addr.length > 28 ? spaceNear : -1;
    if (split > 0) {
      drawText(addr.slice(0, split).trim(), 303.6, 181.0, 7.5, 129);
      drawText(addr.slice(split).trim(),    269.6, 193.0, 7.5, 162.5);
    } else {
      drawText(addr, 303.6, 181.0, 7.5, 129);
    }

    // Course / Yr. & Sec.
    const courseYr = [request.courseProgram, request.yearSection].filter(Boolean).join(" — ");
    drawText(courseYr, 341.4, 206.7, 8, 90.7);

    // Student No.
    drawText(request.studentNo ?? "", 316.6, 218.7, 8, 114.8);

    // Librarian printed name — centered above the signature line
    drawCenteredText(librarian, 354.0, 62.8, 238.0, 7);

    // ── Photo ─────────────────────────────────────────────────────────────────
    if (request.photoUrl) {
      try {
        let photoBytes: Buffer;
        if (request.photoUrl.startsWith("http")) {
          const res = await fetch(request.photoUrl);
          photoBytes = Buffer.from(await res.arrayBuffer());
        } else {
          const b64 = request.photoUrl.replace(/^data:image\/\w+;base64,/, "");
          photoBytes = Buffer.from(b64, "base64");
        }

        // Photo box measured from template
        const boxW = 80;
        const boxH = 108;
        const boxX = 178.6;
        const boxY = 697.1;

        const sharp      = (await import("sharp")).default;
        const croppedBuf = await sharp(photoBytes)
          .resize(boxW * 4, boxH * 4, { fit: "cover", position: "centre" })
          .jpeg({ quality: 92 })
          .toBuffer();

        const img = await pdfDoc.embedJpg(croppedBuf);
        page.drawImage(img, { x: boxX, y: boxY, width: boxW, height: boxH });
      } catch {
        // Skip if photo fails
      }
    }

    // ── Barcode ───────────────────────────────────────────────────────────────
    // Shifted right by 4pt and narrowed by 6pt to prevent left overflow and
    // keep the barcode snug within its box.
    if (request.studentNo) {
      try {
        const bwipjs = await import("bwip-js");

        const boxX = 178.6;
const boxY = 675.48;
const boxW = 80.0;
const boxH = 17.71;

        const barcodeBuffer = await bwipjs.toBuffer({
  bcid:            "code128",
  text:            request.studentNo,
  scale:           3,
  height:          6,
  includetext:     true,
  textxalign:      "center",
  textsize:        8,
  paddingwidth:    0,
  paddingheight:   0,
  backgroundcolor: "ffffff",
});

const barcodeImg = await pdfDoc.embedPng(barcodeBuffer);
page.drawImage(barcodeImg, { x: boxX, y: boxY, width: boxW, height: boxH });
      } catch (err) {
        console.error("[barcode] FAILED:", err);
      }
    }

    // ── Librarian Signature ───────────────────────────────────────────────────
    // Sits directly on the signature line
    if (librarianSig) {
      try {
        let sigBytes: Buffer;
        if (librarianSig.startsWith("http")) {
          const res = await fetch(librarianSig);
          sigBytes  = Buffer.from(await res.arrayBuffer());
        } else {
          const b64 = librarianSig.replace(/^data:image\/\w+;base64,/, "");
          sigBytes  = Buffer.from(b64, "base64");
        }
        const sigImg = await pdfDoc.embedPng(sigBytes);
        page.drawImage(sigImg, { x: 354.0, y: 695.2, width: 62.8, height: 16 });
      } catch {
        // Skip if sig fails
      }
    }

    // ── Return PDF ────────────────────────────────────────────────────────────
    const pdfBytes = await pdfDoc.save();
    const safeName = request.name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="library_card_${safeName}.pdf"`,
      },
    });

  } catch (err) {
    console.error("[GET /library-cards/export-card]", err);
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}