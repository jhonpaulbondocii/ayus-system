// src/app/api/courses/[id]/exit-interviews/[interviewId]/export/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs";
import path from "path";

const PAGE_HEIGHT = 936;
const TEXT_SIZE   = 10;
const SMALL_SIZE  = 9.5;
const MIN_SIZE    = 6;  
const PAD         = 2;

function py(yFromTop: number, lineHeight = 12) {
  return PAGE_HEIGHT - yFromTop - lineHeight + 3;
}

function clipText(
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  text: string, maxWidth: number, size: number
) {
  let s = size;
  while (s > MIN_SIZE && font.widthOfTextAtSize(text, s) > maxWidth) s -= 0.5;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(t, s) > maxWidth) t = t.slice(0, -1);
  return { text: t, size: s };
}

function drawField(
  page: ReturnType<PDFDocument["getPage"]>,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  value: string | null | undefined,
  x: number, yFromTop: number, maxWidth: number, size = TEXT_SIZE
) {
  if (!value) return;
  const { text, size: s } = clipText(font, String(value), maxWidth - PAD * 2, size);
  page.drawText(text, { x: x + PAD, y: py(yFromTop), size: s, font, color: rgb(0, 0, 0) });
}

// Wrap long text across multiple lines
function drawWrappedText(
  page: ReturnType<PDFDocument["getPage"]>,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  text: string, x: number, yFromTop: number,
  maxWidth: number, lineHeight: number, maxLines: number, size = SMALL_SIZE
) {
  if (!text) return;
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth - PAD * 2) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  lines.slice(0, maxLines).forEach((line, i) => {
    page.drawText(line, {
      x: x + PAD,
      y: py(yFromTop + i * lineHeight),
      size,
      font,
      color: rgb(0, 0, 0),
    });
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; interviewId: string }> }
) {
  try {
    const { id: courseId, interviewId } = await params;

    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const interview = await prisma.exitInterview.findUnique({ where: { id: interviewId } });
    if (!interview || interview.courseId !== courseId)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const templatePath  = path.join(process.cwd(), "public", "template", "PSU-QSP-GTC-003-FO004-R01.pdf");
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc        = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
    pdfDoc.registerFontkit(fontkit);
    const calibriBytes  = fs.readFileSync("C:\\Windows\\Fonts\\calibri.ttf");
    const font          = await pdfDoc.embedFont(new Uint8Array(calibriBytes));
    const dingbats      = await pdfDoc.embedFont(StandardFonts.ZapfDingbats);
    const page          = pdfDoc.getPages()[0];

    const fullName = [interview.lastName, interview.firstName, interview.middleName]
      .filter(Boolean).join(", ");

    // ── Header fields ─────────────────────────────────────────────────────────
    // Name line: y≈173.8, underline starts x=106.5 runs to ~x=590 (width≈483)
    drawField(page, font, fullName,                    106, 174, 483);
    // Program & Section: y≈199.4, value after "Section:" x=172, runs to x=355 (width≈181)
    drawField(page, font, interview.programSection,    172, 199, 181);
    // Mobile No: y≈199.4, value after "No:" x=416, runs to x=590 (width≈172)
    drawField(page, font, interview.mobileNo,          416, 199, 172);
    // Month/Year of Graduation: y≈214.2, value x=229, runs to x=390 (width≈159)
    drawField(page, font, interview.graduationMonth,   229, 214, 159);
    // Campus: y≈214.2, value x=441, runs to x=590 (width≈147)
    drawField(page, font, interview.campus,            441, 214, 147);
    // Address (Home): y≈227.1, value x=160, runs to x=590 (width≈428)
    drawField(page, font, interview.homeAddress,       160, 227, 428);

    // ── Checkmark helper ─────────────────────────────────────────────────────
    const check = (x: number, yTop: number) => {
      page.drawText("\u2713", { x, y: py(yTop), size: 10, font: dingbats, color: rgb(0, 0, 0) });
    };

    // ── Q1: How do you feel? ──────────────────────────────────────────────────
    // □ happy x=114.3 y=260  □ excited x=232.8 y=260  □ sad x=364.1 y=260
    // □ nervous x=113.4 y=274  □ challenged x=233.7 y=274  □ Others x=365 y=274 + specify x=415
    if (interview.feelHappy)      check(114, 260);
    if (interview.feelExcited)    check(233, 260);
    if (interview.feelSad)        check(364, 260);
    if (interview.feelNervous)    check(113, 274);
    if (interview.feelChallenged) check(234, 274);
    if (interview.feelOthers) {
      check(365, 274);
      drawField(page, font, interview.feelOthers, 415, 274, 173, SMALL_SIZE);
    }

    // ── Q2: Who influenced you? ───────────────────────────────────────────────
    // □ professor x=114.3 y=302  □ Classmate x=234.2 y=302  □ Friends x=364.7 y=302
    // □ Family x=113.4 y=316  □ Others x=234.8 y=316 + specify x=285
    if (interview.influenceProfessor) check(114, 302);
    if (interview.influenceClassmate) check(234, 302);
    if (interview.influenceFriends)   check(365, 302);
    if (interview.influenceFamily)    check(113, 316);
    if (interview.influenceOthers) {
      check(235, 316);
      drawField(page, font, interview.influenceOthers, 285, 316, 170, SMALL_SIZE);
    }

    // ── Q3: Immediate plan? ───────────────────────────────────────────────────
    // □ Find Job x=114.3 y=344  □ Pursue graduate studies x=285.6 y=344
    // □ Take board exam x=114.3 y=358  □ Others x=289.9 y=358
    if (interview.planFindJob)     check(114, 344);
    if (interview.planGradStudies) check(286, 344);
    if (interview.planBoardExam)   check(114, 358);
    if (interview.planOthers)      check(290, 358);

    // ── Q4: Honorian values ───────────────────────────────────────────────────
    // 3 underlines at y=399.8, 412.7, 425.6 — x=77.4, width≈510
    drawWrappedText(page, font, (interview.honorianValues ?? "").slice(0, 240), 77, 400, 510, 13, 3);

    // ── Q5: Pressing problems ─────────────────────────────────────────────────
    type ProbDetails = {
      familyProblem?: boolean; schoolDifficulties?: boolean; financialProblem?: boolean;
      boyGirl?: boolean; futureJob?: boolean; others?: string;
    };
    const prob = (interview.pressingProblemDetails ?? {}) as ProbDetails;
    // □ Family Problem x=114.3 y=452  □ Difficulties in school x=242.6 y=452  □ Financial Problem x=395.3 y=452
    // □ Boy/Girl relationship x=113.4 y=466  □ Future job x=244.4 y=466  □ Others x=397 y=466 + specify x=443
    if (prob.familyProblem)      check(114, 453);
    if (prob.schoolDifficulties) check(243, 453);
    if (prob.financialProblem)   check(395, 453);
    if (prob.boyGirl)            check(113, 466);
    if (prob.futureJob)          check(244, 466);
    if (prob.others) {
      check(397, 466);
      drawField(page, font, prob.others, 443, 466, 145, SMALL_SIZE);
    }

    // ── Q6: Liked most ───────────────────────────────────────────────────────
    // 3 underlines at y=500.5, 513.4, 526.3 — x=77.4, width≈510
    drawWrappedText(page, font, (interview.likedMost   ?? "").slice(0, 240), 77, 501, 510, 13, 3);
    drawWrappedText(page, font, (interview.likedLeast  ?? "").slice(0, 240), 77, 560, 510, 13, 3);
    drawWrappedText(page, font, (interview.recommend   ?? "").slice(0, 240), 77, 618, 510, 13, 3);
    drawWrappedText(page, font, (interview.suggestions ?? "").slice(0, 240), 77, 671, 510, 13, 3);

    // ── Student Signature ─────────────────────────────────────────────────────
    // Signature image: above the line (y=722.8), draw at y≈700, height=20
    if (interview.studentSignatureUrl) {
      try {
        const sigRes   = await fetch(interview.studentSignatureUrl);
        const sigBytes = await sigRes.arrayBuffer();
        const sigImg   = await pdfDoc.embedPng(Buffer.from(sigBytes));
           page.drawImage(sigImg, { x: 72, y: py(708, 30), width: 220, height: 30 });
      } catch { /* skip */ }
    }
    const studentName = `${interview.firstName} ${interview.lastName}`;
    const studentNameWidth = font.widthOfTextAtSize(studentName, SMALL_SIZE);
    const studentNameX = 72 + (220 - studentNameWidth) / 2;
    page.drawText(studentName, {
      x: studentNameX, y: 208.6, size: SMALL_SIZE, font, color: rgb(0, 0, 0),
    });

    // Student date: below the date line (y=720.9), above "Date" label (y=733.8)
    if (interview.studentSignedAt) {
      const dateStr = new Date(interview.studentSignedAt).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      });
      const dateWidth = font.widthOfTextAtSize(dateStr, SMALL_SIZE);
      const dateX = 396.1 + (144 - dateWidth) / 2;
      page.drawText(dateStr, { x: dateX, y: 208.6, size: SMALL_SIZE, font, color: rgb(0, 0, 0) });
    }

    // ── Counselor Signature ───────────────────────────────────────────────────
    if (interview.counselorSignatureUrl) {
      try {
        const sigRes   = await fetch(interview.counselorSignatureUrl);
        const sigBytes = await sigRes.arrayBuffer();
        const sigImg   = await pdfDoc.embedPng(Buffer.from(sigBytes));
          page.drawImage(sigImg, { x: 72, y: py(751, 20), width: 220, height: 20 });
      } catch { /* skip */ }
    }
    // Counselor name: below "Guidance Counselor" label (y=772.5)
    if (interview.counselorName) {
      const counselorNameWidth = font.widthOfTextAtSize(interview.counselorName, SMALL_SIZE);
      const counselorNameX = 72 + (220 - counselorNameWidth) / 2;
      page.drawText(interview.counselorName, {
        x: counselorNameX, y: 170.0, size: SMALL_SIZE, font, color: rgb(0, 0, 0),
      });
    }
    // Counselor date: below the date line, above "Date" label (y=772.5)
    if (interview.counselorSignedAt) {
      const dateStr = new Date(interview.counselorSignedAt).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      });
      const dateWidth = font.widthOfTextAtSize(dateStr, SMALL_SIZE);
      const dateX = 396.1 + (144 - dateWidth) / 2;
      page.drawText(dateStr, { x: dateX, y: 170.0, size: SMALL_SIZE, font, color: rgb(0, 0, 0) });
    }

    const pdfBytes = await pdfDoc.save();
    const defaultName = `Exit_Interview_${interview.lastName}_${interview.firstName}`
      .replace(/[^a-zA-Z0-9]/g, "_");
    const rawFilename = req.nextUrl.searchParams.get("filename");
    const safeName    = rawFilename
      ? rawFilename.replace(/[^a-zA-Z0-9_\-]/g, "_")
      : defaultName;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `inline; filename="${safeName}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[GET /exit-interviews/export]", err);
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}