import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const { id: courseId, recordId } = await params;

    const record = await prisma.medicalExamRecord.findFirst({
      where: { id: recordId, courseId },
      include: {
        student: {
          select: {
            name: true, studentNumber: true, address: true,
            birthDate: true, age: true, gender: true, course: true,
          },
        },
      },

    });

    if (!record) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }
    console.log("DEBUG civilStatus:", record.civilStatus);
console.log("DEBUG full record keys:", Object.keys(record));
console.log("DEBUG civilStatus VALUE:", JSON.stringify(record.civilStatus));

    const templatePath = path.join(
      process.cwd(), "public", "template",
      "MEDICAL-CLEARANCE-DOC-ODCHIGUE-2025-1.pdf"
    );
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const page = pdfDoc.getPages()[0];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const draw = (text: string, x: number, y: number, size = 9) => {
      if (!text) return;
      page.drawText(String(text), { x, y, size, font, color: rgb(0, 0, 0) });
    };

    const fillCircle = (cx: number, cy: number, size = 3.5) => {
      page.drawCircle({ x: cx, y: cy, size, color: rgb(0, 0, 0) });
    };

    // ── NAME ──────────────────────────────────────────────────────────────────
    // Name label is at y_pdf=634.0, dashed line on same row
    // SURNAME/FIRST NAME/MIDDLE NAME labels at y_pdf=620.5
    // Text should go ON the dashed underline row = y_pdf=634
    // Surname starts after "Name:" label (x=88.9), First at ~289, Middle at ~464
    const nameParts = record.student.name.split(",").map(s => s.trim());
    const surname    = nameParts[0] ?? "";
    const givenParts = (nameParts[1] ?? "").trim().split(" ").filter(Boolean);
    const middleName = givenParts.length > 1 ? givenParts[givenParts.length - 1] : "";
    const firstName  = givenParts.length > 1 ? givenParts.slice(0, -1).join(" ") : givenParts[0] ?? "";

    draw(surname,    139, 631, 9);   // above SURNAME label center
    draw(firstName,  289, 631, 9);   // above FIRST NAME label center
    draw(middleName, 464, 631, 9);   // above MIDDLE NAME label center

    // ── COURSE, YEAR & SECTION ────────────────────────────────────────────────
    // Label at y_pdf=595.6, dashes on same row → text at y=593 (just below label baseline)
    draw(record.student.course ?? "", 172, 593, 9);

    // ── ADDRESS ───────────────────────────────────────────────────────────────
    // Label at y_pdf=572.4 → text at y=570
    draw(record.student.address ?? "", 100, 570, 9);

    // ── AGE ───────────────────────────────────────────────────────────────────
    // Label at y_pdf=550.3, underline at y_pdf=541.6 → center text at y=544
    const age = record.student.age
      ?? (record.student.birthDate
        ? Math.floor((Date.now() - new Date(record.student.birthDate).getTime()) / 31557600000)
        : null);
    // Age underline: x0=75.9 x1=113.1 center_x=94.5
    draw(age ? String(age) : "", 82, 544, 9);

    // ── SEX (radio image buttons at cy_pdf≈548.2) ─────────────────────────────
    // Male: cx=199.8, Female: cx=252.8
    const gender = (record.student.gender ?? "").toLowerCase();
    if (gender === "male")   fillCircle(199.8, 548.2);
    if (gender === "female") fillCircle(252.8, 548.2);

    // ── DATE OF BIRTH ─────────────────────────────────────────────────────────
    // Label at y_pdf=526.4, underlines at y_pdf=517.8
    // DOB underline: x0=119.3 x1=250.7 → center text around x=120, y=520
    // NEW
    if (record.student.birthDate) {
      const dob = new Date(record.student.birthDate).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      });
      draw(dob, 120, 520, 9);
    }

    // ── PLACE OF BIRTH ────────────────────────────────────────────────────────
    // "Place of Birth:" label x=276.1, underline starts x=348.8, same y row as DOB (y=520)
    draw(record.placeOfBirth ?? "", 349, 520, 9);

    // ── VITALS ────────────────────────────────────────────────────────────────
    // Height row label at y_pdf=501.9, underline at y_pdf=493.3 (x0=137, x1=177.9)
    // → text centered: x=138, y=496
    draw(record.height          ? `${record.height} cm`     : "", 138, 496, 9);
    // Heart Rate: after "Heart Rate:" at x=277.9 (dashes start) → x=278, y=496
    draw(record.heartRate       ?? "",                            278, 496, 9);
    // Temperature: after "Temperature:" dashes at x=459.2 → x=460, y=496
    draw(record.temperature     ? `${record.temperature}°C` : "", 460, 496, 9);

    // Weight row label at y_pdf=483.6, underline at y_pdf=474.9 (x0=137.4, x1=178.7)
    // → text centered: x=138, y=478
    draw(record.weight          ? `${record.weight} kg`     : "", 138, 478, 9);
    // Blood Pressure: dashes at x=294.1 → x=295, y=478
    draw(record.bloodPressure   ?? "",                            295, 478, 9);
    // Respiratory Rate: dashes at x=472.9 → x=473, y=478
    draw(record.respiratoryRate ?? "",                            473, 478, 9);

    // ── PHYSICAL SIGNS ────────────────────────────────────────────────────────
    // Left YES circles cx=215.0: SKIN(418.7), ABDOMEN(405.3), HEENT(392.0), GUT(378.6), CHEST(365.3)
    // Left NO circles cx=266.2: same y values
    // Right YES images cx=475.7: EXTREMITIES(419.5), HEART(406.2), NEURO(393.0), BREAST(380.0)
    // Right NO images cx=519.0: EXTREMITIES(419.8), HEART(407.2), NEURO(393.8), BREAST(381.2)
    const signs = (record.physicalSigns ?? {}) as Record<string, boolean>;

    const leftSigns: { key: string; yesY: number; noY: number }[] = [
      { key: "skin",       yesY: 418.7, noY: 418.5 },
      { key: "abdomen",    yesY: 405.3, noY: 405.1 },
      { key: "heent",      yesY: 392.0, noY: 391.8 },
      { key: "gut",        yesY: 378.6, noY: 378.4 },
      { key: "chestLungs", yesY: 365.3, noY: 365.1 },
    ];
    for (const s of leftSigns) {
      if (signs[s.key] === true)  fillCircle(215.0, s.yesY);
      if (signs[s.key] === false) fillCircle(266.2, s.noY);
    }

    const rightSigns: { key: string; yesX: number; noX: number; yesY: number; noY: number }[] = [
      { key: "extremities",  yesX: 475.7, noX: 519.0, yesY: 419.5, noY: 419.8 },
      { key: "heartCvs",     yesX: 475.7, noX: 519.0, yesY: 406.2, noY: 407.2 },
      { key: "neurological", yesX: 475.7, noX: 519.0, yesY: 393.0, noY: 393.8 },
      { key: "breast",       yesX: 475.7, noX: 519.0, yesY: 380.0, noY: 381.2 },
    ];
    for (const s of rightSigns) {
      if (signs[s.key] === true)  fillCircle(s.yesX, s.yesY);
      if (signs[s.key] === false) fillCircle(s.noX,  s.noY);
    }

    // ── REMARKS ───────────────────────────────────────────────────────────────
    // REMARKS: label at y_pdf=314.4, underline at y_pdf=305.7
    // Text just above underline: y=308
    draw(record.remarks ?? "", 109, 308, 9);

    // ── PREGNANT ──────────────────────────────────────────────────────────────
    // YES image: cx=150.3, cy=264.0 | NO image: cx=189.5, cy=264.0
    if (record.isPregnant === true)  fillCircle(150.3, 264.0);
    if (record.isPregnant === false) fillCircle(189.5, 264.0);
    // LMP underline: x0=419.6 x1=525.2 y_pdf=257.7 → text at x=420, y=260
    if (record.isPregnant && record.lastMenstrualPeriod) {
      draw(record.lastMenstrualPeriod, 420, 260, 9);
    }

     // ── CIVIL STATUS ─────────────────────────────────────────────────────────────
if (record.civilStatus === "Single")  fillCircle(399.0, 548.0, 3.5);
if (record.civilStatus === "Married") fillCircle(461.0, 548.0, 3.5);

    // ── FIT / UNFIT ───────────────────────────────────────────────────────────
    // FIT image: cx=204.6, cy=219.5 | UNFIT image: cx=243.5, cy=219.0
    if (record.fitnessStatus === "FIT")   fillCircle(204.6, 219.5);
    if (record.fitnessStatus === "UNFIT") fillCircle(243.5, 219.0);

    // ── TO UNDERGO IN ─────────────────────────────────────────────────────────
    // cx=347.1: Off Campus(204.5), OJT(191.1), Field Trip(177.8), Sports(164.4), Others(151.1)
    const fitnessCircles = [204.5, 191.1, 177.8, 164.4, 151.1];
    const fitnessMatchers = [
      { match: "off campus",  idx: 0 },
      { match: "on-the-job",  idx: 1 },
      { match: "ojt",         idx: 1 },
      { match: "field trip",  idx: 2 },
      { match: "sports",      idx: 3 },
      { match: "others",      idx: 4 },
    ];
    const checkedIdx = new Set<number>();
    for (const f of (record.fitnessFor ?? []).map(f => f.toLowerCase())) {
      for (const m of fitnessMatchers) {
        if (f.includes(m.match)) checkedIdx.add(m.idx);
      }
    }
    for (const idx of checkedIdx) {
      fillCircle(347.1, fitnessCircles[idx]);
    }
    // Others specify underline: x0=440.7 x1=524.4 y_pdf=146.6 → text at x=441, y=149
    const othersEntry = (record.fitnessFor ?? []).find(f => f.startsWith("Others:"));
    if (othersEntry) {
      draw(othersEntry.replace("Others: ", ""), 441, 149, 9);
    }

    // ── DATE ──────────────────────────────────────────────────────────────────
    // Date underline: x0=81.1 x1=160.9 y_pdf=79.7 → text at x=82, y=83
    draw(new Date(record.visitDate).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    }), 82, 83, 9);

    const pdfBytes = await pdfDoc.save();
    const safeName = record.student.name.replace(/[^a-zA-Z0-9]/g, "-");

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="medical-clearance-${safeName}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[GET export-clearance]", err);
    return NextResponse.json({ error: "Failed to generate PDF." }, { status: 500 });
  }
}