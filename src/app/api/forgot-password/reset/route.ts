// src/app/api/forgot-password/reset/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { resetTokenId, password } = await req.json();

    if (!resetTokenId || !password) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    // Find token record
    const record = await prisma.passwordResetToken.findFirst({
      where: {
        id:        resetTokenId,
        usedAt:    null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Reset session expired. Please start over." }, { status: 400 });
    }

    // Hash new password
    const hashed = await bcrypt.hash(password, 12);

    // Update user password + mark token as used (atomic transaction)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data:  { password: hashed },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data:  { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[forgot-password/reset]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}