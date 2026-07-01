import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function fmtBirthday(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

// Build an underlined text run to replace a <w:tab/> placeholder
function underlinedRun(text: string, bold = false): string {
  const bTag = bold ? "<w:b/>" : "";
  return `<w:r><w:rPr>${bTag}<w:u w:val="single"/></w:rPr><w:t xml:space="preserve">${escXml(text)}</w:t></w:r>`;
}

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function POST(
  req: NextRequest,
  _context: { params: { id: string } }
) {
  try {
    const body = await req.json() as {
      to:          string;
      hpi:         string | null;
      reason:      string;
      visitDate:   string;
      complaint:   string;
      diagnosis:   string | null;
      medicine:    string | null;
      medicineUsages: { medicineName: string; quantityUsed: number; unit: string }[];
      student: {
        name:       string;
        address:    string | null;
        birthDate?: string | null;
        age:        number | null;
        gender:     string | null;
      };
    };

    const medicineStr = body.medicineUsages.length > 0
      ? body.medicineUsages.map(u => `${u.medicineName} x ${u.quantityUsed} ${u.unit}`).join(", ")
      : body.medicine ?? "";

    // Load template
    const templatePath = path.join(process.cwd(), "public", "template", "REFERRAL-DOC-ODCHIGUE-ISO-2025-1.docx");
    const templateBytes = fs.readFileSync(templatePath);
    const zip = await JSZip.loadAsync(templateBytes);

    let xml = await zip.file("word/document.xml")!.async("string");

    // ── Replace each field by targeting its unique label context ──
    // Each blank field in the template is: label text + <w:r><w:rPr><w:u w:val="single"/></w:rPr><w:tab/></w:r>
    // We replace the underlined tab run with an underlined text run

    const tabRun = `<w:r><w:rPr><w:u w:val="single"/></w:rPr><w:tab/></w:r>`;
    const tabRunSpaced = `<w:r><w:rPr><w:spacing w:val="53"/></w:rPr><w:t> </w:t></w:r>${tabRun}`;

    // 1. Date — first tab run after "Date:"
    xml = xml.replace(
      `<w:t>Date:</w:t></w:r><w:r><w:rPr><w:spacing w:val="44"/><w:sz w:val="24"/></w:rPr><w:t> </w:t></w:r><w:r><w:rPr><w:sz w:val="24"/><w:u w:val="single"/></w:rPr><w:tab/></w:r>`,
      `<w:t>Date:</w:t></w:r><w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r><w:r><w:rPr><w:sz w:val="24"/><w:u w:val="single"/></w:rPr><w:t>${escXml(fmtDate(body.visitDate))}</w:t></w:r>`
    );

    // 2. To — tab run after "To: "
    xml = xml.replace(
      `<w:t>To:</w:t></w:r><w:r><w:rPr><w:spacing w:val="53"/></w:rPr><w:t> </w:t></w:r>${tabRun}`,
      `<w:t>To:</w:t></w:r><w:r><w:rPr/><w:t xml:space="preserve"> </w:t></w:r>${underlinedRun(body.to)}`
    );

    // 3. Name of Patient — first set of 4 tabs after "Name of Patient: "
    xml = xml.replace(
      `<w:t>Name of Patient:</w:t></w:r><w:r><w:rPr><w:spacing w:val="52"/></w:rPr><w:t> </w:t></w:r><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:tab/><w:tab/><w:tab/><w:tab/></w:r>`,
      `<w:t>Name of Patient:</w:t></w:r><w:r><w:rPr/><w:t xml:space="preserve"> </w:t></w:r>${underlinedRun(body.student.name, true)}`
    );

    // 4. Address — second set of 4 tabs after " Address: "
    xml = xml.replace(
      `<w:t> Address:</w:t></w:r><w:r><w:rPr><w:spacing w:val="52"/></w:rPr><w:t> </w:t></w:r><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:tab/><w:tab/><w:tab/><w:tab/></w:r>`,
      `<w:t> Address:</w:t></w:r><w:r><w:rPr/><w:t xml:space="preserve"> </w:t></w:r>${underlinedRun(body.student.address ?? "")}`
    );

    // 5. Birthday — underlined tab after "Birthday: "
    xml = xml.replace(
      `<w:t> Birthday: </w:t></w:r><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:tab/></w:r>`,
      `<w:t> Birthday: </w:t></w:r>${underlinedRun(fmtBirthday(body.student.birthDate))}`
    );

    // 6. Age — underlined spaces after "Age: "
    xml = xml.replace(
      `<w:t>Age: </w:t></w:r><w:r><w:rPr><w:spacing w:val="80"/><w:w w:val="150"/><w:u w:val="single"/></w:rPr><w:t>   </w:t></w:r>`,
      `<w:t>Age: </w:t></w:r><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t xml:space="preserve"> ${escXml(body.student.age != null ? String(body.student.age) : "")} </w:t></w:r>`
    );

    // 7. Sex — underlined tab after "Sex: "
    xml = xml.replace(
      `<w:t>Sex: </w:t></w:r><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:tab/></w:r>`,
      `<w:t>Sex: </w:t></w:r>${underlinedRun(body.student.gender ?? "")}`
    );

    // 8. Chief Complaint — underlined tab after "Complaint: "
    xml = xml.replace(
      `<w:t>Complaint: </w:t></w:r><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:tab/></w:r>`,
      `<w:t>Complaint: </w:t></w:r>${underlinedRun(body.complaint)}`
    );

    // 9. History of Present Illness — underlined tab after "Illness: "
    xml = xml.replace(
      `<w:t>Illness:</w:t></w:r><w:r><w:rPr><w:spacing w:val="9"/></w:rPr><w:t> </w:t></w:r><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:tab/></w:r>`,
      `<w:t>Illness:</w:t></w:r><w:r><w:rPr/><w:t xml:space="preserve"> </w:t></w:r>${underlinedRun(body.hpi ?? "")}`
    );

    // 10. Diagnosis — underlined tab after "Diagnosis: "
    xml = xml.replace(
      `<w:t>Diagnosis: </w:t></w:r><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:tab/></w:r>`,
      `<w:t>Diagnosis: </w:t></w:r>${underlinedRun(body.diagnosis ?? "")}`
    );

    // 11. Initial medication — underlined tabs after "given: "
    xml = xml.replace(
      `<w:t> Initial medication/s given: </w:t></w:r><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:tab/><w:tab/></w:r>`,
      `<w:t> Initial medication/s given: </w:t></w:r>${underlinedRun(medicineStr)}`
    );

    // 12. Reason for Referral — underlined tab after "Referral: "
    xml = xml.replace(
      `<w:t>Referral:</w:t></w:r><w:r><w:rPr/><w:t> </w:t></w:r><w:r><w:rPr><w:u w:val="single"/></w:rPr><w:tab/></w:r>`,
      `<w:t>Referral:</w:t></w:r><w:r><w:rPr/><w:t xml:space="preserve"> </w:t></w:r>${underlinedRun(body.reason)}`
    );

    // Write back modified XML
    zip.file("word/document.xml", xml);
    const outBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    return new NextResponse(new Uint8Array(outBuffer), {
      status: 200,
      headers: {
        "Content-Type":        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="referral.docx"`,
      },
    });

  } catch (err) {
    console.error("Referral doc error:", err);
    return NextResponse.json({ error: "Failed to generate referral document." }, { status: 500 });
  }
}