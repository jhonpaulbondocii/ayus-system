// src/app/api/courses/[id]/patient-records/medical-certificate/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function underlinedRun(text: string, bold = false): string {
  const bTag = bold ? "<w:b/>" : "";
  return `<w:r><w:rPr>${bTag}<w:u w:val="single"/></w:rPr><w:t xml:space="preserve">${escXml(text)}</w:t></w:r>`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (access.systemRole === "ADMIN") {
      return NextResponse.json({ error: "Admins cannot generate medical certificates" }, { status: 403 });
    }

    const course = await prisma.course.findUnique({
      where:  { id: courseId },
      select: { officeType: true },
    });
    if (course?.officeType !== "CLINIC") {
      return NextResponse.json({ error: "Not a clinic office" }, { status: 403 });
    }

    const body = await req.json() as {
      recordId:       string;
      recommendation: string;
    };

    if (!body.recordId)               return NextResponse.json({ error: "recordId is required" },       { status: 400 });
    if (!body.recommendation?.trim()) return NextResponse.json({ error: "Recommendation is required" }, { status: 400 });

    // Fetch the patient record
    const record = await prisma.patientRecord.findUnique({
      where:  { id: body.recordId },
      select: {
        complaint:  true,
        diagnosis:  true,
        visitDate:  true,
        courseId:   true,
        student: {
          select: {
            name:      true,
            age:       true,
            gender:    true,
            course:    true,
          },
        },
      },
    });

    if (!record)                      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    if (record.courseId !== courseId) return NextResponse.json({ error: "Forbidden" },        { status: 403 });

    const student        = record.student;
    const visitDate      = fmtDate(record.visitDate);
    const today          = fmtDate(new Date());
    const diagnosis      = record.diagnosis ?? record.complaint ?? "";
    const recommendation = body.recommendation.trim();
    const ageSex         = `${student.age ?? ""} / ${student.gender ?? ""}`;

    // Load template
    const templatePath  = path.join(process.cwd(), "public", "template", "MEDICAL-CERTIFICATE-DOC-ODCHIGUE-ISO-2025.docx");
    const templateBytes = fs.readFileSync(templatePath);
    const zip           = await JSZip.loadAsync(templateBytes);

    let xml = await zip.file("word/document.xml")!.async("string");

    // Regex matches ANY <w:r> whose rPr contains <w:u w:val="single"/> and a
    // <w:tab/>, regardless of extra rPr props Word inserts (rsidRPr, color, sz).
    // Ito ang bug dati: naghahanap yung code ng EXACT string, pero laging may
    // dagdag na attributes si Word (w:rsidRPr, <w:color/>, <w:sz/>) kaya 0
    // match palagi at walang na-fi-fill.
    const tabRunRegex = /<w:r\b[^>]*>\s*<w:rPr>([\s\S]*?)<w:u w:val="single"[^/]*\/>([\s\S]*?)<\/w:rPr>\s*<w:tab\/>\s*(?:<w:t[^>]*>([\s\S]*?)<\/w:t>\s*)?<\/w:r>/g;

    // Bawat blangkong linya sa template ay gawa sa MARAMING magkakasunod na
    // tabs, hindi iisa lang. "span" = ilang tabs ang kabilang sa field na yon.
    const fields: { span: number; text: string; bold?: boolean }[] = [
      { span: 1, text: today },                                // Date:
      { span: 3, text: student.name ?? "", bold: true },        // Mr./Ms./Mrs. ___
      { span: 1, text: ageSex },                                // age/sex ___
      { span: 2, text: student.course ?? "" },                  // of ___
      { span: 1, text: visitDate + " " },                       // examined on ___ (extra space para di dumikit sa "and")
      { span: 4, text: diagnosis, bold: true },                 // diagnosed to have ___
      { span: 3, text: recommendation },                        // I recommend ___
      // PTR # blank sa dulo — sadyang hindi ginagalaw, para sa doktor yun
    ];

    let fieldIdx    = 0; // kasalukuyang field na pinu-fill
    let usedInField = 0; // ilang tabs na nagamit sa kasalukuyang field

    xml = xml.replace(tabRunRegex, (match, rPrBefore, rPrAfter, trailingText) => {
      const field = fields[fieldIdx];
      if (!field) return match; // wala nang field na ilalagay — huwag galawin

      usedInField++;
      const isFirstTabOfField = usedInField === 1;

      if (usedInField >= field.span) {
        fieldIdx++;
        usedInField = 0;
      }

      if (isFirstTabOfField) {
        const bTag = field.bold ? "<w:b/>" : "";
        return `<w:r><w:rPr>${bTag}${rPrBefore}<w:u w:val="single"/>${rPrAfter}</w:rPr><w:t xml:space="preserve">${escXml(field.text)}</w:t></w:r>`;
      }

      // Hindi unang tab ng group — burahin na lang ang tab (para di malaki
      // yung blangkong gap pag maikli lang ang na-type), pero i-preserve kung
      // may literal text (hal. yung space bago ang "."):
      if (trailingText !== undefined) {
        return `<w:r><w:rPr>${rPrBefore}${rPrAfter}</w:rPr><w:t xml:space="preserve">${trailingText}</w:t></w:r>`;
      }
      return "";
    });
    zip.file("word/document.xml", xml);
    const outBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    const safeName = (student.name ?? "patient").replace(/[^a-z0-9]/gi, "_");
    return new NextResponse(new Uint8Array(outBuffer), {
      status: 200,
      headers: {
        "Content-Type":        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="medical_certificate_${safeName}.docx"`,
      },
    });

  } catch (err) {
    console.error("[POST /medical-certificate]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}