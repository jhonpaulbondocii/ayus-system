// src/app/api/courses/[id]/library-cards/[requestId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";
import { sendLibraryCardReadyEmail, sendLibraryCardRejectedEmail, sendLibraryCardReleasedEmail } from "@/lib/email";

const ALLOWED_FIELDS = [
  "status",
  "releasedAt",
  "directorSignatureUrl",
  "directorSignedAt",
  "directorName",
  "recipientSignatureUrl",
  "recipientSignedAt",
  "corIdUrl",
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const { id: courseId, requestId } = await params;
    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok)
      return NextResponse.json({ error: access.error }, { status: access.status });

    const data = await req.json();

    const releasedBy = data._releasedBy ?? null;
    const update: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in data) update[key] = data[key];
    }

    if (Object.keys(update).length === 0)
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });

    const request = await prisma.libraryCardRequest.update({
      where: { id: requestId, courseId },
      data:  update,
    });

    // ── Auto-create LibraryReceivingLog when statuss → RELEASED ──────────────
    if (data.status === "RELEASED") {
      const existing = await prisma.libraryReceivingLog.findUnique({
        where: { requestId },
      });

      // Generate e-signature token
      const crypto  = await import("crypto");
      const signToken           = crypto.randomBytes(32).toString("hex");
      const signTokenExpiresAt  = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

      if (!existing) {
        await prisma.libraryReceivingLog.create({
          data: {
            courseId,
            requestId,
            name:             request.name,
            sex:              request.sex ?? null,
            courseYearSection:
              request.applicantType === "STUDENT"
                ? [request.courseProgram, request.yearSection]
                    .filter(Boolean)
                    .join(" ") || null
                : null,
            collegeDept:      request.collegeDept ?? null,
            position:         request.position   ?? null,
            documentReceived: "Library Card",
            releasedBy:       releasedBy,
            signatureUrl:     data.recipientSignatureUrl ?? null,
            signedAt:         data.recipientSignedAt
                                ? new Date(data.recipientSignedAt)
                                : null,
            signatureMethod:  data.recipientSignatureUrl ? "PAD" : null,
            dateReceived:     new Date(),
            signToken,
            signTokenExpiresAt,
          },
        });
      } else {
        if (data.recipientSignatureUrl && !existing.signatureUrl) {
          await prisma.libraryReceivingLog.update({
            where: { requestId },
            data: {
              signatureUrl:    data.recipientSignatureUrl,
              signedAt:        data.recipientSignedAt
                                 ? new Date(data.recipientSignedAt)
                                 : new Date(),
              signatureMethod: "PAD",
              releasedBy:      data.releasedBy ?? existing.releasedBy,
            },
          });
        }
      }

      // ── Send e-signature email to recipient ────────────────────────────────
      if (request.email) {
        const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "https://ayus-system-production.up.railway.app";
        const signUrl  = `${appUrl}/sign/library-log/${signToken}`;
        sendLibraryCardReleasedEmail({
          to:            request.email,
          name:          request.name,
          applicantType: request.applicantType as "STUDENT" | "EMPLOYEE",
          signUrl,
        }).catch(err => console.error("[Library Card Released Email]", err));
      }
    }

    // ── Recipient sig added on already-released record (edge case) ───────────
    if (data.recipientSignatureUrl && data.status !== "RELEASED") {
      const log = await prisma.libraryReceivingLog.findUnique({
        where: { requestId },
      });
      if (log && !log.signatureUrl) {
        await prisma.libraryReceivingLog.update({
          where: { requestId },
          data: {
            signatureUrl:    data.recipientSignatureUrl,
            signedAt:        data.recipientSignedAt
                               ? new Date(data.recipientSignedAt)
                               : new Date(),
            signatureMethod: "PAD",
          },
        });
      }
    }

    // ── Send email on READY or REJECTED ──────────────────────────────────────
    if (data.status === "READY" && request.email) {
      sendLibraryCardReadyEmail({
        to:            request.email,
        name:          request.name,
        applicantType: request.applicantType as "STUDENT" | "EMPLOYEE",
      }).catch(err => console.error("[Library Card Ready Email]", err));
    }

    if (data.status === "REJECTED" && request.email) {
      const formUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://ayus-system-production.up.railway.app"}/forms/library/${courseId}`;
      sendLibraryCardRejectedEmail({
        to:            request.email,
        name:          request.name,
        applicantType: request.applicantType as "STUDENT" | "EMPLOYEE",
        formUrl,
      }).catch(err => console.error("[Library Card Rejected Email]", err));
    }

    return NextResponse.json({ request });
  } catch (err) {
    console.error("[PATCH /library-cards/[requestId]]", err);
    return NextResponse.json({ error: "Failed to update." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const { id: courseId, requestId } = await params;
    const access = await requireCoursePermission(courseId, "view_course");
    if (!access.ok)
      return NextResponse.json({ error: access.error }, { status: access.status });

    await prisma.libraryCardRequest.delete({
      where: { id: requestId, courseId },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /library-cards/[requestId]]", err);
    return NextResponse.json({ error: "Failed to delete." }, { status: 500 });
  }
}