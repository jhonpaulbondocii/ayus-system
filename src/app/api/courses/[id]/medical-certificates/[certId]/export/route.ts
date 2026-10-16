// src/app/api/courses/[id]/medical-certificates/[certId]/export/route.ts
//
// Fills the MEDICAL-CERTIFICATE-DOC template (.docx) with the record's data
// using a Python helper script, then streams the filled .docx to the client.
//
// Place the template at:
//   public/template/MEDICAL-CERTIFICATE-ISO-2025.docx
//
// ─── ALSO CREATE THIS HELPER SCRIPT ─────────────────────────────────────────
// scripts/fill_medical_certificate.py  (see the companion .py file)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

function resolveAge(student: { age: number | null; birthDate: Date | null }): number | null {
  if (student.age) return student.age;
  if (student.birthDate) {
    return Math.floor(
      (Date.now() - new Date(student.birthDate).getTime()) / 31_557_600_000
    );
  }
  return null;
}

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; certId: string }> }
) {
  try {
    const { id: courseId, certId } = await params;

    const record = await prisma.medicalCertificate.findFirst({
      where: { id: certId, courseId },
      include: {
        student: {
          select: {
            name: true, studentNumber: true, age: true,
            birthDate: true, gender: true, course: true,
          },
        },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }

    const templatePath = path.join(
      process.cwd(),
      "public",
      "template",
      "MEDICAL-CERTIFICATE-ISO-2025.docx"
    );

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: "Certificate template not found. Please place MEDICAL-CERTIFICATE-ISO-2025.docx in public/template/." },
        { status: 500 }
      );
    }

    const scriptPath = path.join(process.cwd(), "scripts", "fill_medical_certificate.py");

    // Build the data payload as JSON for the python script
    const gender = (record.student.gender ?? "").toLowerCase();
    const honorific = gender === "female" ? "Ms." : "Mr.";
    const age = resolveAge(record.student as { age: number | null; birthDate: Date | null });
    const ageSex = age
      ? `${age}/${gender === "female" ? "F" : gender === "male" ? "M" : record.student.gender ?? ""}`
      : record.student.gender ?? "";

    const data = {
      date:           fmtDate(record.visitDate),
      honorific,
      name:           record.student.name,
      age_sex:        ageSex,
      course:         record.student.course ?? "",
      date_examined:  fmtDate(record.visitDate),
      diagnosis:      record.diagnosis,
      recommendation: record.recommendation,
      ptr_number:     record.ptrNumber ?? "",
    };

    // Write data to a temp JSON file
    const tmpDir     = os.tmpdir();
    const dataFile   = path.join(tmpDir, `cert-data-${certId}.json`);
    const outputFile = path.join(tmpDir, `cert-out-${certId}.docx`);

    fs.writeFileSync(dataFile, JSON.stringify(data));

    try {
      await execFileAsync(process.platform === "win32" ? "python" : "python3", [
        scriptPath,
        "--template", templatePath,
        "--data",     dataFile,
        "--output",   outputFile,
      ]);
    } finally {
      fs.rmSync(dataFile, { force: true });
    }

    if (!fs.existsSync(outputFile)) {
      return NextResponse.json({ error: "Failed to generate certificate." }, { status: 500 });
    }

    const docxBytes = fs.readFileSync(outputFile);
    fs.rmSync(outputFile, { force: true });

    const safeName = record.student.name.replace(/[^a-zA-Z0-9]/g, "-");

    return new NextResponse(docxBytes, {
      status: 200,
      headers: {
        "Content-Type":        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="medical-certificate-${safeName}.docx"`,
      },
    });
  } catch (err) {
    console.error("[GET /medical-certificates/export]", err);
    return NextResponse.json({ error: "Failed to generate certificate." }, { status: 500 });
  }
}