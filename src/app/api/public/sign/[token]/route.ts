// src/app/api/public/sign/[token]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/public/sign/[token]
// Public endpoint — fetches the visit details for the student to review
// before signing. No auth required; the token itself is the credential.
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

    const record = await prisma.patientRecord.findUnique({
      where: { signToken: token },
      select: {
        id:                 true,
        complaint:          true,
        temperature:        true,
        bloodPressure:      true,
        pulseRate:          true,
        weight:             true,
        diagnosis:          true,
        medicine:           true,
        action:             true,
        notes:              true,
        visitDate:          true,
        signedAt:           true,
        signTokenExpiresAt: true,
        student: {
          select: { name: true, studentNumber: true },
        },
        medicineUsages: {
          select: { medicineName: true, quantityUsed: true, unit: true },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: "This link is invalid or has already been used." },
        { status: 404 }
      );
    }

    // Already signed previously (token would normally be cleared, but just in case)
    if (record.signedAt) {
      return NextResponse.json(
        { error: "This record has already been signed." },
        { status: 409 }
      );
    }

    // Expired
    if (record.signTokenExpiresAt && record.signTokenExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "This signing link has expired. Please contact the clinic for a new link." },
        { status: 410 }
      );
    }

    // Strip internal/expiry fields before sending to the client
    const { signTokenExpiresAt, signedAt, ...visit } = record;

    return NextResponse.json({ visit });
  } catch (err) {
    console.error("[GET /public/sign/:token]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/public/sign/[token]
// Public endpoint — student submits their drawn or uploaded e-signature.
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

    // ── Validate signature payload ──────────────────────────────────────────
    if (!signatureDataUrl || typeof signatureDataUrl !== "string") {
      return NextResponse.json({ error: "Signature is required." }, { status: 400 });
    }
    if (!signatureDataUrl.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid signature format." }, { status: 400 });
    }
    // ~1.5MB ceiling for the base64 string (keeps the DB row reasonable)
    if (signatureDataUrl.length > 2_000_000) {
      return NextResponse.json(
        { error: "Signature image is too large. Please try again." },
        { status: 413 }
      );
    }

    const record = await prisma.patientRecord.findUnique({
      where: { signToken: token },
      select: { id: true, signedAt: true, signTokenExpiresAt: true },
    });

    if (!record) {
      return NextResponse.json(
        { error: "This link is invalid or has already been used." },
        { status: 404 }
      );
    }
    if (record.signedAt) {
      return NextResponse.json(
        { error: "This record has already been signed." },
        { status: 409 }
      );
    }
    if (record.signTokenExpiresAt && record.signTokenExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "This signing link has expired. Please contact the clinic for a new link." },
        { status: 410 }
      );
    }

    await prisma.patientRecord.update({
      where: { id: record.id },
      data: {
        signatureUrl:       signatureDataUrl,
        signatureMethod:    method === "uploaded" ? "uploaded" : "drawn",
        signedAt:           new Date(),
        signToken:          null, // invalidate — di na pwede ulit gamitin ang link
        signTokenExpiresAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /public/sign/:token]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}