// src/app/api/courses/[id]/patient-records/export/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

const ACTION_LABELS: Record<string, string> = {
  GIVEN_MEDICINE:    "Given Medicine Only",
  SENT_HOME:         "Sent Home",
  FOR_OBSERVATION:   "For Observation",
  REFERRED_HOSPITAL: "Referred to Hospital",
  REFERRED_GUIDANCE: "Referred to Guidance",
};

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}
function formatDateShort(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}
function formatTime(d: Date | string) {
  return new Date(d).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

async function fetchRecords(courseId: string, dateFrom?: string, dateTo?: string) {
  return prisma.patientRecord.findMany({
    where: {
      courseId,
      ...(dateFrom || dateTo ? {
        visitDate: {
          ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
          ...(dateTo   ? { lte: new Date(`${dateTo}T23:59:59.999Z`)   } : {}),
        },
      } : {}),
    },
    select: {
      complaint:     true,
      temperature:   true,
      bloodPressure: true,
      pulseRate:     true,
      weight:        true,
      diagnosis:     true,
      medicine:      true,
      action:        true,
      notes:          true,
      visitDate:      true,
      signatureUrl:   true,
      signedAt:       true,
      signatureMethod:true,
      student: {
        select: {
          studentNumber: true,
          name:          true,
          age:           true,
          gender:        true,
          course:        true,
        },
      },
      recordedByUser: { select: { name: true } },
    },
    orderBy: { visitDate: "desc" },
  });
}

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

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { officeType: true, name: true },
    });
    if (course?.officeType !== "CLINIC") {
      return NextResponse.json({ error: "Not a clinic office" }, { status: 403 });
    }

    const url      = new URL(req.url);
    const format   = url.searchParams.get("format")   ?? "excel";
    const dateFrom = url.searchParams.get("dateFrom") ?? "";
    const dateTo   = url.searchParams.get("dateTo")   ?? "";

    const records = await fetchRecords(courseId, dateFrom, dateTo);
    const fileName = `patient_records_${new Date().toISOString().slice(0, 10)}`;

    const dateRangeLabel = dateFrom && dateTo
      ? `${formatDateShort(dateFrom)} – ${formatDateShort(dateTo)}`
      : dateFrom ? `From ${formatDateShort(dateFrom)}`
      : dateTo   ? `Until ${formatDateShort(dateTo)}`
      : "All Records";

    const rows = records.map(r => ({
      date:          formatDateShort(r.visitDate),
      time:          formatTime(r.visitDate),
      studentNo:     r.student.studentNumber,
      name:          r.student.name,
      course:        r.student.course        ?? "—",
      age:           r.student.age != null   ? String(r.student.age) : "—",
      gender:        r.student.gender        ?? "—",
      complaint:     r.complaint,
      temperature:   r.temperature != null   ? `${r.temperature}°C` : "—",
      bloodPressure: r.bloodPressure         ?? "—",
      pulseRate:     r.pulseRate != null     ? `${r.pulseRate} bpm` : "—",
      weight:        r.weight != null        ? `${r.weight} kg`     : "—",
      diagnosis:     r.diagnosis             ?? "—",
      medicine:      r.medicine              ?? "—",
      action:        ACTION_LABELS[r.action] ?? r.action,
      notes:         r.notes                 ?? "—",
      recordedBy:    r.recordedByUser.name   ?? "—",
      signed:        r.signedAt ? `Signed ${formatDateShort(r.signedAt)} ${formatTime(r.signedAt)}` : "Unsigned",
      signMethod:    r.signatureMethod === "uploaded" ? "Uploaded" : r.signatureMethod === "drawn" ? "Drawn" : "—",
    }));

    const colHeaders = [
        "Date", "Time", "Student No.", "Name", "Course",
        "Age", "Gender", "Chief Complaint", "Temp", "BP",
        "Pulse", "Weight", "Diagnosis", "Medicine / Dosage",
        "Action Taken", "Notes", "Recorded By", "E-Signature",
      ];

    // ── EXCEL ──────────────────────────────────────────────────────────────────
    if (format === "excel") {
      const XLSX = await import("xlsx");

      const wsData = [
        [`${course.name} — Patient Records`],
        [`Period: ${dateRangeLabel}`],
        [`Generated: ${formatDate(new Date())}    Total Records: ${rows.length}`],
        [],
        colHeaders,
        ...rows.map(r => [
          r.date, r.time, r.studentNo, r.name, r.course,
          r.age, r.gender, r.complaint, r.temperature,
          r.bloodPressure, r.pulseRate, r.weight,
          // NG ITO:
          r.diagnosis, r.medicine, r.action, r.notes, r.recordedBy,
          r.signed,
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!cols"] = [
        { wch: 13 }, { wch: 10 }, { wch: 15 }, { wch: 24 }, { wch: 18 },
        { wch: 5  }, { wch: 8  }, { wch: 26 }, { wch: 8  },
        { wch: 10 }, { wch: 10 }, { wch: 10 },
        { wch: 24 }, { wch: 24 }, { wch: 22 }, { wch: 28 }, { wch: 18 },
        { wch: 20 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Patient Records");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(buf, {
        headers: {
          "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${fileName}.xlsx"`,
        },
      });
    }

    // ── PDF — landscape A3 for more space ──────────────────────────────────────
    if (format === "pdf") {
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.jsPDF ?? jsPDFModule.default;
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
      const pageW = doc.internal.pageSize.getWidth();

      // Maroon header bar
      doc.setFillColor(123, 17, 19);
      doc.rect(0, 0, pageW, 30, "F");

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("Patient Records", 14, 13);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(255, 200, 200);
      doc.text(course.name, 14, 20);
      doc.text(`Period: ${dateRangeLabel}`, 14, 26);

      doc.text(`Generated: ${formatDate(new Date())}`, pageW - 14, 20, { align: "right" });
      doc.text(`Total Records: ${rows.length}`, pageW - 14, 26, { align: "right" });

      doc.setTextColor(0, 0, 0);

      // Fixed column widths that sum to ~390mm (A3 landscape usable width)
      autoTable(doc, {
        startY: 34,
        head:   [colHeaders],
        body:   rows.map(r => [
          r.date, r.time, r.studentNo, r.name, r.course,
          r.age, r.gender, r.complaint, r.temperature,
          r.bloodPressure, r.pulseRate, r.weight,
          r.diagnosis, r.medicine, r.action, r.notes, r.recordedBy,
          records[rows.indexOf(r)]?.signatureUrl ? "" : "—",
        ]),
        styles: {
          fontSize:    7.5,
          cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
          overflow:    "linebreak",
          valign:      "middle",
          lineColor:   [229, 231, 235],
          lineWidth:   0.2,
        },
        headStyles: {
          fillColor:  [123, 17, 19],
          textColor:  [255, 255, 255],
          fontStyle:  "bold",
          fontSize:   7.5,
          halign:     "center",
          valign:     "middle",
          minCellHeight: 10,
        },
        alternateRowStyles: {
          fillColor: [253, 242, 242],
        },
        // All widths in mm — total = 392mm fits A3 landscape margins
        columnStyles: {
          0:  { cellWidth: 19, halign: "center" },  // Date
          1:  { cellWidth: 14, halign: "center" },  // Time
          2:  { cellWidth: 22, halign: "center" },  // Student No.
          3:  { cellWidth: 28 },                    // Name
          4:  { cellWidth: 20 },                    // Course
          5:  { cellWidth: 9,  halign: "center" },  // Age
          6:  { cellWidth: 16, halign: "center" },  // Gender
          7:  { cellWidth: 32 },                    // Chief Complaint
          8:  { cellWidth: 12, halign: "center" },  // Temp
          9:  { cellWidth: 14, halign: "center" },  // BP
          10: { cellWidth: 14, halign: "center" },  // Pulse
          11: { cellWidth: 13, halign: "center" },  // Weight
          12: { cellWidth: 28 },                    // Diagnosis
          13: { cellWidth: 28 },                    // Medicine
          14: { cellWidth: 24 },                    // Action
          15: { cellWidth: 28 },                    // Notes
          16: { cellWidth: 21 },                    // Recorded By
          17: { cellWidth: 30, halign: "center" },  // E-Signature
        },
        didDrawCell: (data) => {
          if (data.column.index === 17 && data.section === "body") {
            const rowIndex = data.row.index;
            const sigUrl = records[rowIndex]?.signatureUrl;
            if (sigUrl && sigUrl.startsWith("data:image/")) {
              try {
                const { x, y, width, height } = data.cell;
                const padding = 2;
                doc.addImage(
                  sigUrl, "PNG",
                  x + padding,
                  y + padding,
                  width - padding * 2,
                  height - padding * 2,
                );
              } catch {
                // skip kung may error sa image
              }
            }
          }
        },
        didDrawPage: (data) => {
          const pageH = doc.internal.pageSize.getHeight();
          doc.setFontSize(7);
          doc.setTextColor(150);
          doc.text(
            `Page ${data.pageNumber}`,
            pageW - 14, pageH - 6,
            { align: "right" }
          );
          doc.text(
            `${course.name} — Patient Records — CONFIDENTIAL`,
            14, pageH - 6
          );
          doc.setTextColor(0);
        },
      });

      const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type":        "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName}.pdf"`,
        },
      });
    }

    // ── DOCX — landscape A3 ────────────────────────────────────────────────────
    if (format === "docx") {
      const {
        Document, Packer, Paragraph, Table,
        TableRow, TableCell, TextRun,
        WidthType, AlignmentType, ShadingType,
        BorderStyle, PageOrientation,
      } = await import("docx");

      const MAROON       = "7B1113";
      const MAROON_LIGHT = "FEF2F2";

      // A3 landscape: 42cm x 29.7cm = 23814 x 16838 twips
      // Usable width minus margins (720 each side) = 23814 - 1440 = 22374 twips
      const colWidths = [
        1300, // Date
        1000, // Time
        1600, // Student No.
        2000, // Name
        1600, // Course
         600, // Age
         900, // Gender
        2400, // Chief Complaint
         800, // Temp
        1000, // BP
        1000, // Pulse
         900, // Weight
        1800, // Diagnosis
        1800, // Medicine
        1700, // Action Taken
        2400, // Notes
        1400, // Recorded By
        2200, // E-Signature
      ];// total = 24200 — fills A3 landscape nicely

      const thinBorder = {
        top:    { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
        left:   { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
        right:  { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
      };

      const noBorder = {
        top:    { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        left:   { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        right:  { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      };

      const makeHeaderCell = (text: string, width: number) =>
        new TableCell({
          width:   { size: width, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: MAROON, fill: MAROON },
          borders: noBorder,
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children:  [new TextRun({ text, bold: true, color: "FFFFFF", size: 14 })],
          })],
        });

      const makeDataCell = (text: string, width: number, isAlt: boolean, centered = false) =>
        new TableCell({
          width:   { size: width, type: WidthType.DXA },
          shading: isAlt
            ? { type: ShadingType.SOLID, color: MAROON_LIGHT, fill: MAROON_LIGHT }
            : { type: ShadingType.SOLID, color: "FFFFFF",     fill: "FFFFFF"     },
          borders: thinBorder,
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({
            alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT,
            children:  [new TextRun({ text: String(text), size: 14 })],
          })],
        });

      const makeImageCell = async (base64: string | null, width: number, isAlt: boolean) => {
        const { ImageRun } = await import("docx");
        const children = base64 && base64.startsWith("data:image/")
          ? [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new ImageRun({
                data: base64.split(",")[1],
                transformation: { width: 80, height: 30 },
                type: "png",
              })],
            })]
          : [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "—", size: 14 })],
            })];
        return new TableCell({
          width:   { size: width, type: WidthType.DXA },
          shading: isAlt
            ? { type: ShadingType.SOLID, color: MAROON_LIGHT, fill: MAROON_LIGHT }
            : { type: ShadingType.SOLID, color: "FFFFFF", fill: "FFFFFF" },
          borders: thinBorder,
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children,
        });
      };

      const centered = [true, true, true, false, false, true, true,
                        false, true, true, true, true, false, false, false, false, false, true];

      const headerRow = new TableRow({
        tableHeader: true,
        children: colHeaders.map((h, i) => makeHeaderCell(h, colWidths[i])),
      });

      const dataRows = await Promise.all(rows.map(async (r, idx) => {
        const isAlt = idx % 2 === 1;
        const textVals = [
          r.date, r.time, r.studentNo, r.name, r.course,
          r.age, r.gender, r.complaint, r.temperature,
          r.bloodPressure, r.pulseRate, r.weight,
          r.diagnosis, r.medicine, r.action, r.notes, r.recordedBy,
        ];
        const textCells = textVals.map((v, i) =>
          makeDataCell(v, colWidths[i], isAlt, centered[i])
        );
        const sigCell = await makeImageCell(records[idx]?.signatureUrl ?? null, colWidths[17], isAlt);
        return new TableRow({
          children: [...textCells, sigCell],
        });
      }));

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              size: {
                // A3 landscape in twips (1 inch = 1440 twips)
                // A3 = 420mm x 297mm → 23814 x 16838 twips
                width:       23814,
                height:      16838,
                orientation: PageOrientation.LANDSCAPE,
              },
              margin: { top: 720, bottom: 720, left: 720, right: 720 },
            },
          },
          children: [
            // Title
            new Paragraph({
              spacing: { before: 0, after: 80 },
              children: [
                new TextRun({ text: "Patient Records", bold: true, size: 40, color: MAROON }),
              ],
            }),
            // Subtitle
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({ text: course.name, bold: true, size: 20, color: "374151" }),
                new TextRun({ text: "   •   ", size: 20, color: "D1D5DB" }),
                new TextRun({ text: `Period: ${dateRangeLabel}`, size: 18, color: "6B7280" }),
                new TextRun({ text: "   •   ", size: 18, color: "D1D5DB" }),
                new TextRun({ text: `Total: ${rows.length} records`, size: 18, color: "6B7280" }),
              ],
            }),
            new Paragraph({
              spacing: { after: 160 },
              children: [
                new TextRun({ text: `Generated: ${formatDate(new Date())}`, size: 16, color: "9CA3AF" }),
              ],
            }),
            // Divider
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: MAROON } },
              spacing: { after: 160 },
              children: [],
            }),
            // Table
            new Table({
              width:  { size: 100, type: WidthType.PERCENTAGE },
              rows:   [headerRow, ...dataRows],
            }),
            // Footer note
            new Paragraph({
              spacing: { before: 240 },
              children: [
                new TextRun({
                  text:    "CONFIDENTIAL — This document contains sensitive medical information intended for authorized personnel only.",
                  size:    14,
                  color:   "9CA3AF",
                  italics: true,
                }),
              ],
            }),
          ],
        }],
      });

      const buf = await Packer.toBuffer(doc);
      return new NextResponse(buf as unknown as BodyInit, {
        headers: {
          "Content-Type":        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${fileName}.docx"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid format. Use: excel, pdf, docx" }, { status: 400 });

  } catch (err) {
    console.error("[GET /patient-records/export]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}