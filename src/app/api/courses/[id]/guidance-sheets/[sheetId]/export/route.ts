// src/app/api/courses/[id]/guidance-sheets/[sheetId]/export/route.ts
// Generates a filled PDF of the Individual Information Sheet for a specific student

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import sharp from "sharp";
import fs from "fs";
import path from "path";

// ─── Page dimensions (portrait, 612 x 936 pts) ───────────────────────────────
// pdfplumber uses top-left origin; pdf-lib uses bottom-left origin.
// Conversion: pdf_y = PAGE_HEIGHT - measured_top - lineHeight + 3
const PAGE_HEIGHT = 936;
const TEXT_SIZE   = 8;
const SMALL_SIZE  = 7;
const MIN_SIZE    = 5;
const PAD         = 2;

function py(yFromTop: number, lineHeight = 12) {
  return PAGE_HEIGHT - yFromTop - lineHeight + 3;
}

function clipText(
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  text: string,
  maxWidth: number,
  size: number
): { text: string; size: number } {
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
  x: number,
  yFromTop: number,
  maxWidth: number,
  size = TEXT_SIZE
) {
  if (!value) return;
  const { text, size: s } = clipText(font, String(value), maxWidth - PAD * 2, size);
  page.drawText(text, { x: x + PAD, y: py(yFromTop), size: s, font, color: rgb(0, 0, 0) });
}

function drawFieldCentered(
  page: ReturnType<PDFDocument["getPage"]>,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  value: string | null | undefined,
  x: number,
  yFromTop: number,
  fieldWidth: number,
  size = TEXT_SIZE
) {
  if (!value) return;
  const { text, size: s } = clipText(font, String(value), fieldWidth - PAD * 2, size);
  const textWidth = font.widthOfTextAtSize(text, s);
  const centeredX = x + (fieldWidth - textWidth) / 2;
  page.drawText(text, { x: centeredX, y: py(yFromTop), size: s, font, color: rgb(0, 0, 0) });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sheetId: string }> }
) {
  try {
    const { id: courseId, sheetId } = await params;

    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const sheet = await prisma.guidanceInfoSheet.findUnique({ where: { id: sheetId } });
    if (!sheet || sheet.courseId !== courseId)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const templatePath  = path.join(process.cwd(), "public", "template", "PSU-QSP-GTC-005-FO002-R00.pdf");
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc        = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
    const font          = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const page1 = pdfDoc.getPages()[0];
    const page2 = pdfDoc.getPages()[1];

    // ── Type helpers ──────────────────────────────────────────────────────────
    type SibRow  = { name?: string; schoolWork?: string; age?: string | number };
    type EducRow = { level?: string; school?: string; years?: string };
    type EducBg  = { elementary?: EducRow[]; juniorHigh?: EducRow[]; seniorHigh?: EducRow[]; tertiary?: EducRow[]; techVoc?: EducRow[] };
    type OrgRow  = { name?: string; position?: string };
    type OrgData = { academic?: OrgRow[]; nonAcademic?: OrgRow[] };

    const siblings: SibRow[]  = Array.isArray(sheet.siblings)      ? (sheet.siblings as SibRow[])      : [];
    const educ                = (sheet.educBackground ?? {})        as EducBg;
    const orgs                = (sheet.organizations  ?? {})        as OrgData;

    // ═════════════════════════════════════════════════════════════════════════
    // PAGE 1
    // ═════════════════════════════════════════════════════════════════════════

    // ── Header ────────────────────────────────────────────────────────────────
    drawField(page1, font, sheet.courseProgram, 92, 141, 83);
    drawField(page1, font, sheet.yearSection,   92, 154, 83);
    drawField(page1, font, sheet.studentNo,     92, 167, 83);

    // ── Personal Info ─────────────────────────────────────────────────────────
    drawField(page1, font, sheet.name,         165, 205, 176);
    drawField(page1, font, sheet.nickname,     453, 205, 132);
    drawField(page1, font, sheet.age != null ? String(sheet.age) : null, 165, 217, 176);
    drawField(page1, font, sheet.dateOfBirth,  453, 217, 132);
    drawField(page1, font, sheet.placeOfBirth, 165, 230, 176);
    drawField(page1, font, sheet.sex,          453, 230, 132);
    drawField(page1, font, sheet.birthOrder,   165, 243, 176);
    drawField(page1, font, sheet.religion,     453, 243, 132);
    drawField(page1, font, sheet.mobileNo,     165, 255, 176);
    drawField(page1, font, sheet.email,        453, 255, 132);
    drawField(page1, font, sheet.completeAddress, 165, 268, 423);

    // ── Parents' Information ──────────────────────────────────────────────────
    const parentRows: [keyof typeof sheet, keyof typeof sheet, number][] = [
      ["fatherName",        "motherName",        316],
      ["fatherDOB",         "motherDOB",         329],
      ["fatherAddress",     "motherAddress",     341],
      ["fatherContact",     "motherContact",     354],
      ["fatherEduc",        "motherEduc",        367],
      ["fatherOccupation",  "motherOccupation",  379],
      ["fatherIncome",      "motherIncome",      392],
      ["fatherLanguage",    "motherLanguage",    405],
      ["fatherReligion",    "motherReligion",    417],
      ["fatherOFW",         "motherOFW",         430],
      ["fatherYearsAbroad", "motherYearsAbroad", 443],
    ];
    for (const [fKey, mKey, yTop] of parentRows) {
      drawField(page1, font, sheet[fKey] as string, 23,  yTop, 218, SMALL_SIZE);
      drawField(page1, font, sheet[mKey] as string, 374, yTop, 202, SMALL_SIZE);
    }

    // ── Siblings ──────────────────────────────────────────────────────────────
    const sibRowYs = [506, 518, 531, 544, 556, 569, 582, 594];
    for (let i = 0; i < Math.min(siblings.length, 8); i++) {
      const sib = siblings[i]; if (!sib) continue;
      drawField(page1, font, sib.name,       23,  sibRowYs[i], 229, SMALL_SIZE);
      drawField(page1, font, sib.schoolWork, 288, sibRowYs[i], 213, SMALL_SIZE);
      drawField(page1, font, sib.age != null ? String(sib.age) : null, 524, sibRowYs[i], 31, SMALL_SIZE);
    }

    // ── Marital Status ────────────────────────────────────────────────────────
    const maritalMap: { label: string; x: number; yTop: number }[] = [
      { label: "Living together but not married",     x: 23,  yTop: 632 },
      { label: "Permanently separated",               x: 230, yTop: 632 },
      { label: "Others",                              x: 446, yTop: 632 },
      { label: "Father w/ another partner",           x: 23,  yTop: 645 },
      { label: "Temporarily separated",               x: 230, yTop: 645 },
      { label: "Mother w/ another partner",           x: 23,  yTop: 658 },
      { label: "Marriage annulled/legally separated", x: 230, yTop: 658 },
      { label: "Married in Church",                   x: 23,  yTop: 670 },
      { label: "Civil Marriage",                      x: 230, yTop: 670 },
    ];
    const dingbats = await pdfDoc.embedFont(StandardFonts.ZapfDingbats);
    for (const opt of maritalMap) {
      if (sheet.maritalStatus === opt.label) {
        page1.drawText("\u2713", {
          x: opt.x,
          y: py(opt.yTop),
          size: 9,
          font: dingbats,
          color: rgb(0, 0, 0),
        });
      }
    }

    // ── Guardian Information ──────────────────────────────────────────────────
    drawField(page1, font, sheet.guardianName,     239, 708, 163);
    drawField(page1, font, sheet.guardianContact,  469, 708, 86);
    drawField(page1, font, sheet.guardianAddress,  68,  721, 488);
    drawField(page1, font, sheet.emergencyPerson,  210, 733, 191);
    drawField(page1, font, sheet.emergencyContact, 468, 733, 86);

    // ── Educational Background — Page 1 ──────────────────────────────────────
    const elemRows = educ.elementary ?? [];
    const elemYs   = [803, 815];
    for (let i = 0; i < Math.min(elemRows.length, 2); i++) {
      const r = elemRows[i]; if (!r) continue;
      drawField(page1, font, r.level,  23,  elemYs[i], 114, SMALL_SIZE);
      drawField(page1, font, r.school, 194, elemYs[i], 224, SMALL_SIZE);
      drawField(page1, font, r.years,  482, elemYs[i], 97,  SMALL_SIZE);
    }
    const jhRows = [...(educ.juniorHigh ?? []), ...(educ.seniorHigh ?? [])];
    const jhYs   = [858, 870];
    for (let i = 0; i < Math.min(jhRows.length, 2); i++) {
      const r = jhRows[i]; if (!r) continue;
      drawField(page1, font, r.level,  23,  jhYs[i], 114, SMALL_SIZE);
      drawField(page1, font, r.school, 194, jhYs[i], 224, SMALL_SIZE);
      drawField(page1, font, r.years,  482, jhYs[i], 97,  SMALL_SIZE);
    }

    // ── Passport Photo — Page 1 ───────────────────────────────────────────────
    // Uses sharp to resize+center-crop the photo to exactly fit the passport box.
    // Behavior: object-fit: cover — always fills the box, no distortion, no overflow.
    if (sheet.photoUrl) {
      try {
        const photoRes    = await fetch(sheet.photoUrl);
        const photoBuffer = Buffer.from(await photoRes.arrayBuffer());

        // Passport box in PDF pts
        // Exact box coords from pdfplumber (bottom-left origin, same as pdf-lib):
        // x0=480.4, y0=773.2, x1=581.2, y1=902.8
        const BOX_X = 481;
        const BOX_Y = 773;
        const BOX_W = 100;
        const BOX_H = 129;

        const SCALE = 2;

        const croppedBuffer = await sharp(photoBuffer)
          .resize(BOX_W * SCALE, BOX_H * SCALE, {
            fit:      "cover",
            position: "centre",
          })
          .png()
          .toBuffer();

        const photoImg = await pdfDoc.embedPng(croppedBuffer);

        page1.drawImage(photoImg, {
          x:      BOX_X,
          y:      BOX_Y,
          width:  BOX_W,
          height: BOX_H,
        });
      } catch (e) {
        console.error("Passport photo embed failed:", e);
      }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PAGE 2
    // ═════════════════════════════════════════════════════════════════════════

    // ── Tertiary Level ────────────────────────────────────────────────────────
    const tertRows = educ.tertiary ?? [];
    const tertYs   = [76, 89];
    for (let i = 0; i < Math.min(tertRows.length, 2); i++) {
      const r = tertRows[i]; if (!r) continue;
      drawField(page2, font, r.level,  23,  tertYs[i], 114, SMALL_SIZE);
      drawField(page2, font, r.school, 194, tertYs[i], 224, SMALL_SIZE);
      drawField(page2, font, r.years,  482, tertYs[i], 97,  SMALL_SIZE);
    }

    // ── Technical Vocational ──────────────────────────────────────────────────
    const tvRows = educ.techVoc ?? [];
    const tvYs   = [127, 140];
    for (let i = 0; i < Math.min(tvRows.length, 2); i++) {
      const r = tvRows[i]; if (!r) continue;
      drawField(page2, font, r.level,  23,  tvYs[i], 114, SMALL_SIZE);
      drawField(page2, font, r.school, 194, tvYs[i], 224, SMALL_SIZE);
      drawField(page2, font, r.years,  482, tvYs[i], 97,  SMALL_SIZE);
    }

    // ── Awards / Honors ───────────────────────────────────────────────────────
    if (sheet.awards) {
      const maxW  = 555;
      const aSize = SMALL_SIZE;
      const full  = sheet.awards.trim();
      const mid   = Math.floor(full.length / 2);
      let split   = full.indexOf(" ", mid);
      if (split < 0) split = full.length;
      const line1 = full.slice(0, split).trim();
      const line2 = full.slice(split).trim();
      drawField(page2, font, line1, 23, 175, maxW, aSize);
      if (line2) drawField(page2, font, line2, 23, 189, maxW, aSize);
    }

    // ── Membership in Organizations ───────────────────────────────────────────
    const acadOrgs    = orgs.academic    ?? [];
    const nonAcadOrgs = orgs.nonAcademic ?? [];
    const orgYs       = [256, 269, 282];
    for (let i = 0; i < Math.min(acadOrgs.length, 3); i++) {
      const o = acadOrgs[i]; if (!o) continue;
      drawField(page2, font, o.name,     23,  orgYs[i], 141, SMALL_SIZE);
      drawField(page2, font, o.position, 194, orgYs[i], 86,  SMALL_SIZE);
    }
    for (let i = 0; i < Math.min(nonAcadOrgs.length, 3); i++) {
      const o = nonAcadOrgs[i]; if (!o) continue;
      drawField(page2, font, o.name,     322, orgYs[i], 135, SMALL_SIZE);
      drawField(page2, font, o.position, 482, orgYs[i], 81,  SMALL_SIZE);
    }

    // ── Unique Features ───────────────────────────────────────────────────────
    drawField(page2, font, sheet.interests,       71,  463, 394);
    drawField(page2, font, sheet.talents,         65,  476, 400);
    drawField(page2, font, sheet.hobbies,         68,  489, 400);
    drawField(page2, font, sheet.goals,           90,  501, 378);
    drawField(page2, font, sheet.principles,      106, 514, 362);
    drawField(page2, font, sheet.characteristics, 211, 527, 257);
    drawField(page2, font, sheet.fears,           94,  539, 373);

    // ── Physical/Mental Health ────────────────────────────────────────────────
    const drawCheck = (page: ReturnType<PDFDocument["getPage"]>, x: number, yTop: number) => {
      page.drawText("\u2713", { x, y: py(yTop), size: 9, font: dingbats, color: rgb(0, 0, 0) });
    };

    // A1 — academics: center check inside the checkbox
    // "No" box center ≈ x:222, "Yes" box center ≈ x:272
    if (sheet.healthAcademics) {
      const isNo = sheet.healthAcademics === "No";
      drawCheck(page2, isNo ? 214 : 265, 609);
      if (!isNo) {
        const spec = sheet.healthAcademics === "Yes" ? "" : sheet.healthAcademics;
        drawField(page2, font, spec, 360, 609, 170, SMALL_SIZE);
      }
    }

    if (sheet.healthExtracurricular) {
      const isNo = sheet.healthExtracurricular === "No";
      drawCheck(page2, isNo ? 214 : 265, 635);
      if (!isNo) {
        const spec = sheet.healthExtracurricular === "Yes" ? "" : sheet.healthExtracurricular;
        drawField(page2, font, spec, 360, 635, 170, SMALL_SIZE);
      }
    }

    if (sheet.psychiatricHelp) {
      drawCheck(page2, sheet.psychiatricHelp === "Yes" ? 307 : 360, 658);
    }

    if (sheet.counseling) {
      const isNo = sheet.counseling === "No";
      drawCheck(page2, isNo ? 278 : 226, 686);
      if (!isNo) {
        const spec = sheet.counseling === "Yes" ? "" : sheet.counseling;
        drawField(page2, font, spec, 360, 686, 170, SMALL_SIZE);
      }
    }

    // ── Signature ─────────────────────────────────────────────────────────────
    // Moved down slightly so it sits below the consent text without overlapping
    if (sheet.signatureUrl) {
      try {
        const sigRes   = await fetch(sheet.signatureUrl);
        const sigBytes = await sigRes.arrayBuffer();
        const sigImg   = await pdfDoc.embedPng(Buffer.from(sigBytes));
        // y: py(762, 40) — shifted 10 pts lower than original py(752, 40)
        page2.drawImage(sigImg, { x: 399, y: py(762, 40), width: 199, height: 40 });
      } catch { /* skip */ }
    }

    // Printed name — centered on the signature line
    drawFieldCentered(page2, font, sheet.name, 399, 790, 199, SMALL_SIZE);

    // ── Date Signed ───────────────────────────────────────────────────────────
    if (sheet.signedAt) {
      const dateStr = new Date(sheet.signedAt).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      });
      drawFieldCentered(page2, font, dateStr, 399, 830, 199, SMALL_SIZE);
    }

    // ── Build and return PDF ──────────────────────────────────────────────────
    const pdfBytes = await pdfDoc.save();
    const safeName = sheet.name.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_");
    const reqFilename = req.nextUrl.searchParams.get("filename");
    const finalName   = reqFilename
      ? reqFilename.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim()
      : `IIS_${safeName}_${sheet.studentNo}`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="${finalName}.pdf"`,
      },
    });

  } catch (err) {
    console.error("[GET /guidance-sheets/export]", err);
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}