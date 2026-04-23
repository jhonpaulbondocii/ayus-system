// src/app/api/forgot-password/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import bcrypt from "bcryptjs";

const resend = new Resend(process.env.RESEND_API_KEY);

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmail(email: string, name: string, otp: string) {
  await resend.emails.send({
    from:    "PSU Canvas <onboarding@resend.dev>",
    to:      email,
    subject: "Password Reset Code — PSU Canvas",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="width:56px;height:56px;background:#7b1113;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin:0 auto;">
            <span style="color:#fff;font-weight:700;font-size:14px;">PSU</span>
          </div>
        </div>
        <h2 style="text-align:center;color:#1a202c;margin:0 0 8px;">Password Reset</h2>
        <p style="text-align:center;color:#6b7280;font-size:14px;margin:0 0 24px;">
          Hi ${name}, use the code below to reset your PSU Canvas password.
        </p>
        <div style="background:#f9fafb;border:2px dashed #e5e7eb;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="font-size:40px;font-weight:700;letter-spacing:14px;color:#7b1113;margin:0;font-family:monospace;">${otp}</p>
        </div>
        <p style="text-align:center;color:#9ca3af;font-size:12px;margin:0;">
          This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
        </p>
        <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:8px;">
          If you didn't request this, you can safely ignore this email.
        </p>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;" />
        <p style="text-align:center;color:#d1d5db;font-size:11px;margin:0;">
          Pampanga State University — Mexico Campus
        </p>
      </div>
    `,
  });
}

async function sendSMS(phone: string, otp: string) {
  // Normalize: 09XXXXXXXXX → 09XXXXXXXXX (Semaphore accepts local PH format)
  const normalized = phone.replace(/^\+63/, "0").replace(/\s/g, "");
  const res = await fetch("https://api.semaphore.co/api/v4/messages", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey:     process.env.SEMAPHORE_API_KEY,
      number:     normalized,
      message:    `[PSU Canvas] Your password reset code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
      sendername: "PSUCANVAS",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Semaphore error: ${err}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { identifier, via } = await req.json() as { identifier: string; via: "email" | "sms" };

    if (!identifier?.trim() || !via) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Find user by email or contactNumber
    const user = via === "email"
      ? await prisma.user.findFirst({
          where: { email: { equals: identifier.trim(), mode: "insensitive" }, status: "APPROVED" },
          select: { id: true, name: true, email: true },
        })
      : await prisma.user.findFirst({
          where: { contactNumber: identifier.trim().replace(/^\+63/, "0").replace(/\s/g, ""), status: "APPROVED" },
          select: { id: true, name: true, email: true, contactNumber: true },
        });

    // Always return success — don't reveal if account exists (security best practice)
    if (!user) return NextResponse.json({ success: true });

    // Delete old unused tokens
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    // Generate OTP and hash it
    const otp    = generateOTP();
    const hashed = await bcrypt.hash(otp, 10);

    await prisma.passwordResetToken.create({
      data: {
        userId:    user.id,
        token:     hashed,
        via,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
      },
    });

    if (via === "email") {
      await sendEmail(user.email, user.name, otp);
    } else {
      const phone = (user as { contactNumber?: string | null }).contactNumber ?? identifier.trim();
      await sendSMS(phone, otp);
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[forgot-password/send]", err);
    return NextResponse.json({ error: "Failed to send code. Please try again." }, { status: 500 });
  }
}