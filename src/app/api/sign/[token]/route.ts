import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — i-validate ang token (ginagamit ng /sign/[token] page para i-check kung valid pa)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const record = await prisma.patientRecord.findUnique({
      where: { signToken: token },
      select: {
        id:                true,
        signedAt:          true,
        signTokenExpiresAt:true,
        complaint:         true,
        visitDate:         true,
        action:            true,
        student: {
          select: { name: true },
        },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Invalid or expired link." }, { status: 404 });
    }

    if (record.signedAt) {
      return NextResponse.json({ error: "Already signed." }, { status: 409 });
    }

    if (record.signTokenExpiresAt && new Date() > record.signTokenExpiresAt) {
      return NextResponse.json({ error: "This link has expired." }, { status: 410 });
    }

    return NextResponse.json({
      studentName: record.student.name,
      complaint:   record.complaint,
      visitDate:   record.visitDate,
      action:      record.action,
    });
  } catch (err) {
    console.error("[GET /api/sign/[token]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — i-save ang signature
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json() as {
      signatureDataUrl: string; // base64 PNG: "data:image/png;base64,..."
      method:           string; // "drawn" | "uploaded"
    };

    if (!body.signatureDataUrl?.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid signature data." }, { status: 400 });
    }

    const record = await prisma.patientRecord.findUnique({
      where: { signToken: token },
      select: {
        id:                 true,
        signedAt:           true,
        signTokenExpiresAt: true,
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Invalid or expired link." }, { status: 404 });
    }

    if (record.signedAt) {
      return NextResponse.json({ error: "Already signed." }, { status: 409 });
    }

    if (record.signTokenExpiresAt && new Date() > record.signTokenExpiresAt) {
      return NextResponse.json({ error: "This link has expired." }, { status: 410 });
    }

    await prisma.patientRecord.update({
      where: { id: record.id },
      data: {
        signatureUrl:    body.signatureDataUrl,
        signatureMethod: body.method,
        signedAt:        new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/sign/[token]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}