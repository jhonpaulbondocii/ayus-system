import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMedExamSignatureRequestEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const { id: courseId, recordId } = await params;
    const record = await prisma.medicalExamRecord.findFirst({
      where: { id: recordId, courseId },
      include: {
        student: { select: { name: true, email: true } },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }

    if (record.signedAt) {
      return NextResponse.json({ error: "Already signed." }, { status: 409 });
    }

    if (!record.student.email) {
      return NextResponse.json({ error: "Student has no email address on file." }, { status: 400 });
    }

    // Generate token (reuse existing if not yet expired)
    let token = record.signToken;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    if (!token || (record.signTokenExpiresAt && record.signTokenExpiresAt < now)) {
      token = crypto.randomBytes(32).toString("hex");
      await prisma.medicalExamRecord.update({
        where: { id: record.id },
        data: {
          signToken:          token,
          signTokenExpiresAt: expiresAt,
          signEmailSentAt:    now,
        },
      });
    } else {
      // Just update the sent timestamp
      await prisma.medicalExamRecord.update({
        where: { id: record.id },
        data: { signEmailSentAt: now },
      });
    }

    await sendMedExamSignatureRequestEmail({
      to:        record.student.email,
      name:      record.student.name,
      visitDate: record.visitDate.toISOString(),
      purpose:   record.purpose,
      signToken: token,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST send-signature med-exam]", err);
    return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
  }
}