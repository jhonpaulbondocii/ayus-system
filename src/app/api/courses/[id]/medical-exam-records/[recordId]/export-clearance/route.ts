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

    const templatePath = path.join(
      process.cwd(), "public", "template",
      "MEDICAL-CLEARANCE-ISO-2026-REGULAR-CAMPUS.pdf"
    );
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const page = pdfDoc.getPages()[0];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const draw = (text: string, x: number, y: number, size = 9) => {
      if (!text) return;
      page.drawText(String(text), { x, y, size, font, color: rgb(0, 0, 0) });
    };

    // Fills a circular radio-button icon (used for Sex, Civil Status, Pregnant, FIT/UNFIT, To-undergo-in)
    const fillCircle = (cx: number, cy: number, size = 3.5) => {
      page.drawCircle({ x: cx, y: cy, size, color: rgb(0, 0, 0) });
    };

    // Fills a square checkbox glyph (used for the Physical Signs Disorder YES/NO table)
    const fillCheckbox = (cx: number, cy: number, size = 6) => {
      page.drawRectangle({
        x: cx - size / 2,
        y: cy - size / 2,
        width: size,
        height: size,
        color: rgb(0, 0, 0),
      });
    };

    // ── NAME ──────────────────────────────────────────────────────────────────
    // Underline row: y_pdf=625.5 → text at y=628
    // Surname col x=139, First Name col x=289, Middle Name col x=465
    const nameParts = record.student.name.split(",").map(s => s.trim());
    const surname    = nameParts[0] ?? "";
    const givenParts = (nameParts[1] ?? "").trim().split(" ").filter(Boolean);
    const middleName = givenParts.length > 1 ? givenParts[givenParts.length - 1] : "";
    const firstName  = givenParts.length > 1 ? givenParts.slice(0, -1).join(" ") : givenParts[0] ?? "";

    draw(surname,    139, 628, 9);
    draw(firstName,  289, 628, 9);
    draw(middleName, 465, 628, 9);

    // ── COURSE, YEAR & SECTION ────────────────────────────────────────────────
    // Underline: y_pdf=587.5 → text at y=590, starts after "Section:" label (x=172)
    draw(record.student.course ?? "", 172, 590, 9);

    // ── ADDRESS ───────────────────────────────────────────────────────────────
    // Underline: y_pdf=563.9 → text at y=566, starts after "Address:" label (x=100)
    draw(record.student.address ?? "", 100, 566, 9);

    // ── AGE ───────────────────────────────────────────────────────────────────
    // Underline x0=75.9 x1=113.1, y_pdf=543.0 → text at x=82, y=546
    const age = record.student.age
      ?? (record.student.birthDate
        ? Math.floor((Date.now() - new Date(record.student.birthDate).getTime()) / 31557600000)
        : null);
    draw(age ? String(age) : "", 82, 546, 9);

    // ── SEX (radio icons, cy≈550.3) ─────────────────────────────────────────
    // Male cx=199.8, Female cx=252.85
    const gender = (record.student.gender ?? "").toLowerCase();
    if (gender === "male")   fillCircle(199.8, 550.3);
    if (gender === "female") fillCircle(252.85, 550.3);

    // ── CIVIL STATUS (radio icons, same row as Sex, cy≈550.3) ─────────────────
    // Single cx=401.1, Married cx=463.3
    if (record.civilStatus === "Single")  fillCircle(401.1, 550.3);
    if (record.civilStatus === "Married") fillCircle(463.3, 550.3);

    // ── DATE OF BIRTH ─────────────────────────────────────────────────────────
    // Underline x0=119.3 x1=250.4, y_pdf=519.0 → text at x=120, y=522
    if (record.student.birthDate) {
      const dob = new Date(record.student.birthDate).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      });
      draw(dob, 120, 522, 9);
    }

    // ── PLACE OF BIRTH ────────────────────────────────────────────────────────
    // Underline x0=353.6 x1=550.2, same row as DOB (y=522) → text at x=355
    draw(record.placeOfBirth ?? "", 355, 522, 9);

    // ── VITALS ────────────────────────────────────────────────────────────────
    // Row 1: Height (underline y_pdf=494.6) / Heart Rate (dash text) / Temperature (dash text)
    draw(record.height          ? `${record.height} cm`     : "", 138, 497, 9);
    draw(record.heartRate       ?? "",                            278, 496, 9);
    draw(record.temperature     ? `${record.temperature}°C` : "", 460, 496, 9);

    // Row 2: Weight (underline y_pdf=476.1) / Blood Pressure (dash text) / Respiratory Rate (dash text)
    draw(record.weight          ? `${record.weight} kg`     : "", 138, 478, 9);
    draw(record.bloodPressure   ?? "",                            295, 478, 9);
    draw(record.respiratoryRate ?? "",                            473, 478, 9);

    // ── PHYSICAL SIGNS DISORDER ───────────────────────────────────────────────
    // 4 rows x 3 columns of square checkboxes (☐), not radio circles.
    // Columns: (skin/head/eyes/ears), (nose/throat/chestLungs/heart), (abdomen/kidneyBladder/brain/mentalDisorder)
    const signs = (record.physicalSigns ?? {}) as Record<string, boolean>;

    const physicalSignsGrid: { key: string; yesX: number; noX: number; y: number }[] = [
      { key: "skin",           yesX: 143.35, noX: 173.35, y: 401.2 },
      { key: "nose",           yesX: 313.05, noX: 343.0,  y: 401.2 },
      { key: "abdomen",        yesX: 482.75, noX: 512.65, y: 401.2 },

      { key: "head",           yesX: 143.35, noX: 173.35, y: 385.5 },
      { key: "throat",         yesX: 313.05, noX: 343.0,  y: 385.5 },
      { key: "kidneyBladder",  yesX: 482.75, noX: 512.65, y: 385.5 },

      { key: "eyes",           yesX: 143.35, noX: 173.35, y: 370.4 },
      { key: "chestLungs",     yesX: 313.05, noX: 343.0,  y: 370.4 },
      { key: "brain",          yesX: 482.75, noX: 512.65, y: 370.4 },

      { key: "ears",           yesX: 143.35, noX: 173.35, y: 355.3 },
      { key: "heart",          yesX: 313.05, noX: 343.0,  y: 355.3 },
      { key: "mentalDisorder", yesX: 482.75, noX: 512.65, y: 355.3 },
    ];
    for (const s of physicalSignsGrid) {
      if (signs[s.key] === true)  fillCheckbox(s.yesX, s.y);
      if (signs[s.key] === false) fillCheckbox(s.noX,  s.y);
    }

    // ── REMARKS ───────────────────────────────────────────────────────────────
    // Two blank lines: line 1 sits beside the "REMARKS:" label (y=294), line 2 full-width below (y=274)
    draw(record.remarks ?? "", 110, 294, 9);

    // ── PREGNANT ──────────────────────────────────────────────────────────────
    // YES cx=140.0, NO cx=181.3, cy≈253.3
    if (record.isPregnant === true)  fillCircle(140.0, 253.3);
    if (record.isPregnant === false) fillCircle(181.3, 253.3);
    // LMP underline x0=419.6 x1=525.2, y_pdf=246.7 → text at x=420, y=250
    if (record.isPregnant && record.lastMenstrualPeriod) {
      draw(record.lastMenstrualPeriod, 420, 250, 9);
    }

    // ── FIT / UNFIT ───────────────────────────────────────────────────────────
    // FIT cx=193.1, UNFIT cx=232.2, cy≈218.7
    if (record.fitnessStatus === "FIT")   fillCircle(193.1, 218.7);
    if (record.fitnessStatus === "UNFIT") fillCircle(232.2, 218.7);

    // ── TO UNDERGO IN ─────────────────────────────────────────────────────────
    // 3 stacked radio icons at cx=350.8: Field Trip/Educational Tour, Outbound Activities, Others
    const fitnessCircleX = 350.8;
    const fitnessCircleY = [198.75, 185.4, 172.0];
    const fitnessMatchers = [
      { match: "field trip", idx: 0 },
      { match: "outbound",   idx: 1 },
      { match: "others",     idx: 2 },
    ];
    const checkedIdx = new Set<number>();
    for (const f of (record.fitnessFor ?? []).map(f => f.toLowerCase())) {
      for (const m of fitnessMatchers) {
        if (f.includes(m.match)) checkedIdx.add(m.idx);
      }
    }
    for (const idx of checkedIdx) {
      fillCircle(fitnessCircleX, fitnessCircleY[idx]);
    }
    // Others specify underline: x0=439.6 x1=524.4, y_pdf=165.6 → text at x=441, y=168
    const othersEntry = (record.fitnessFor ?? []).find(f => f.startsWith("Others:"));
    if (othersEntry) {
      draw(othersEntry.replace("Others: ", ""), 441, 168, 9);
    }

    // ── DATE ──────────────────────────────────────────────────────────────────
    // Underline x0=81.1 x1=160.9, y_pdf=56.7 → text at x=82, y=60
    draw(new Date(record.visitDate).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    }), 82, 60, 9);

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