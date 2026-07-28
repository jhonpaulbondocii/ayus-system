// src/app/api/public/sign/library-log/[token]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/public/sign/library-log/[token]
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token?.trim()) {
      return NextResponse.json({ error: "Invalid link." }, { status: 400 });
    }

    const log = await prisma.libraryReceivingLog.findUnique({
      where: { signToken: token },
      select: {
        id:                 true,
        name:               true,
        documentReceived:   true,
        dateReceived:       true,
        courseYearSection:  true,
        collegeDept:        true,
        signedAt:           true,
        signTokenExpiresAt: true,
      },
    });

    if (!log) {
      return NextResponse.json(
        { error: "This link is invalid or has already been used." },
        { status: 404 }
      );
    }

    if (log.signedAt) {
      return NextResponse.json(
        { error: "This receiving log has already been signed." },
        { status: 409 }
      );
    }

    if (log.signTokenExpiresAt && log.signTokenExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "This signing link has expired. Please contact the Library Office for a new link." },
        { status: 410 }
      );
    }

    const { signTokenExpiresAt, signedAt, ...safeLog } = log;

    return NextResponse.json({ log: safeLog });
  } catch (err) {
    console.error("[GET /public/sign/library-log/:token]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/public/sign/library-log/[token]
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token?.trim()) {
      return NextResponse.json({ error: "Invalid link." }, { status: 400 });
    }

    const body = await req.json() as {
      signatureDataUrl?: string;
      method?: "drawn" | "uploaded";
    };

    const { signatureDataUrl, method } = body;

    if (!signatureDataUrl || typeof signatureDataUrl !== "string") {
      return NextResponse.json({ error: "Signature is required." }, { status: 400 });
    }
    if (!signatureDataUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid signature format." }, { status: 400 });
    }
    if (signatureDataUrl.length > 2_000_000) {
      return NextResponse.json(
        { error: "Signature image is too large. Please try again." },
        { status: 413 }
      );
    }

    const log = await prisma.libraryReceivingLog.findUnique({
      where: { signToken: token },
      select: { id: true, signedAt: true, signTokenExpiresAt: true },
    });

    if (!log) {
      return NextResponse.json(
        { error: "This link is invalid or has already been used." },
        { status: 404 }
      );
    }
    if (log.signedAt) {
      return NextResponse.json(
        { error: "This receiving log has already been signed." },
        { status: 409 }
      );
    }
    if (log.signTokenExpiresAt && log.signTokenExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "This signing link has expired. Please contact the Library Office for a new link." },
        { status: 410 }
      );
    }

    await prisma.libraryReceivingLog.update({
      where: { id: log.id },
      data: {
        signatureUrl:       signatureDataUrl,
        signatureMethod:    method === "uploaded" ? "uploaded" : "drawn",
        signedAt:           new Date(),
        signToken:          null,
        signTokenExpiresAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /public/sign/library-log/:token]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}