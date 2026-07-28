// src/app/api/public/sign/guidance/[token]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const entry = await prisma.guidanceLogEntry.findUnique({
      where: { signToken: token },
    });

    if (!entry) {
      return NextResponse.json({ error: "This link is invalid or has expired." }, { status: 404 });
    }
    if (entry.signedAt) {
      return NextResponse.json({ error: "This record has already been signed." }, { status: 410 });
    }
    if (entry.signTokenExpiresAt && entry.signTokenExpiresAt < new Date()) {
      return NextResponse.json({ error: "This signing link has expired. Please contact the Guidance Office." }, { status: 410 });
    }

    return NextResponse.json({
      visit: {
        id:        entry.id,
        name:      entry.name,
        visitDate: entry.visitDate.toISOString(),
        purpose:   entry.purpose,
        department: entry.department,
      },
    });
  } catch (err) {
    console.error("[GET /public/sign/guidance]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const entry = await prisma.guidanceLogEntry.findUnique({
      where: { signToken: token },
    });

    if (!entry) {
      return NextResponse.json({ error: "Invalid or expired link." }, { status: 404 });
    }
    if (entry.signedAt) {
      return NextResponse.json({ error: "Already signed." }, { status: 410 });
    }
    if (entry.signTokenExpiresAt && entry.signTokenExpiresAt < new Date()) {
      return NextResponse.json({ error: "This link has expired." }, { status: 410 });
    }

    const body = await req.json();
    const { signatureDataUrl, method } = body;

    if (!signatureDataUrl?.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid signature data." }, { status: 400 });
    }

    await prisma.guidanceLogEntry.update({
      where: { id: entry.id },
      data: {
        signatureUrl:    signatureDataUrl,
        signatureMethod: method ?? "drawn",
        signedAt:        new Date(),
        signToken:       null,
        signTokenExpiresAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /public/sign/guidance]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}