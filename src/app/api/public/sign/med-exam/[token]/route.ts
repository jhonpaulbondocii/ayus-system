import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — validate token
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const record = await prisma.medicalExamRecord.findUnique({
      where: { signToken: token },
      select: {
        id:                 true,
        signedAt:           true,
        signTokenExpiresAt: true,
        purpose:            true,
        visitDate:          true,
        fitnessStatus:      true,
        fitnessFor:         true,
        clearanceRemarks:   true,
        remarks:            true,
        student: { select: { name: true, studentNumber: true } },
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

    return NextResponse.json({ exam: record });
  } catch (err) {
    console.error("[GET /api/public/sign/med-exam/[token]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — save signature
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json() as {
      signatureDataUrl: string;
      method: string;
    };

    if (!body.signatureDataUrl?.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid signature data." }, { status: 400 });
    }

    const record = await prisma.medicalExamRecord.findUnique({
      where: { signToken: token },
      select: { id: true, signedAt: true, signTokenExpiresAt: true },
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

    await prisma.medicalExamRecord.update({
      where: { id: record.id },
      data: {
        signatureUrl:    body.signatureDataUrl,
        signatureMethod: body.method,
        signedAt:        new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/public/sign/med-exam/[token]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}