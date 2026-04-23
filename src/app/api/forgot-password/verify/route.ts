// src/app/api/forgot-password/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { identifier, via, otp } = await req.json();

    if (!identifier || !via || !otp) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Find user
    let user;
    if (via === "email") {
      user = await prisma.user.findFirst({
        where: { email: { equals: identifier.trim(), mode: "insensitive" } },
        select: { id: true },
      });
    } else {
      user = await prisma.user.findFirst({
        where: { contactNumber: identifier.trim() },
        select: { id: true },
      });
    }

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
    }

    // Find latest unused, unexpired token
    const record = await prisma.passwordResetToken.findFirst({
      where: {
        userId:    user.id,
        via,
        usedAt:    null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
    }

    const valid = await bcrypt.compare(otp.trim(), record.token);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 400 });
    }

    // Return a short-lived reset session token (just the record ID is enough)
    return NextResponse.json({ success: true, resetTokenId: record.id });

  } catch (err) {
    console.error("[forgot-password/verify]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}