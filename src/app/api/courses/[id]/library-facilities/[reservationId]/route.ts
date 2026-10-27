// src/app/api/courses/[courseId]/library-facilities/[id]/route.ts
// IPALIT
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma"; // ⚠️ same path as in _lib.ts
import { authorize, checkRules, FACILITY_TYPES } from "../_lib";
import { sendDecisionEmail, sendCsmEmail } from "@/lib/reservationMail";

type Ctx = { params: Promise<{ id: string; reservationId: string }> };

/**
 * PATCH body: { action, ...data }
 *  approve     { facilityType, facilityNo?, facilityOther?, librarianName?, librarianSignatureUrl?, override? }
 *  disapprove  { reason }
 *  complete    {}
 *  noshow      {}   (allowed only 15+ mins after start time)
 *  cancel      {}
 *  csm         { csmSubmitted: boolean }
 *  letter      { letterReceived: boolean }
 */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id: courseId, reservationId: id } = await ctx.params;
  const auth = await authorize(courseId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const b = await req.json().catch(() => null);
  if (!b?.action) return NextResponse.json({ error: "Missing action." }, { status: 400 });

  const current = await prisma.libraryFacilityReservation.findFirst({ where: { id, courseId } });
  if (!current) return NextResponse.json({ error: "Reservation not found." }, { status: 404 });

  const done = async (data: Record<string, unknown>, notify = false) => {
    const reservation = await prisma.libraryFacilityReservation.update({ where: { id }, data });
    if (notify) sendDecisionEmail(reservation).catch(console.error);
    if (reservation.status === "COMPLETED" && reservation.csmToken && !current.csmToken)
      sendCsmEmail(reservation).catch(console.error);
    return NextResponse.json({ reservation });
  };

  switch (b.action) {
    case "approve": {
      if (current.status !== "PENDING")
        return NextResponse.json({ error: "Only pending requests can be approved." }, { status: 409 });
      if (!current.letterReceived)
        return NextResponse.json({ error: "Confirm first that the approved request letter was received." }, { status: 409 });
      if (!(FACILITY_TYPES as readonly string[]).includes(b.facilityType))
        return NextResponse.json({ error: "Select a facility." }, { status: 400 });
      if (b.facilityType === "DISCUSSION" && !String(b.facilityNo ?? "").trim())
        return NextResponse.json({ error: "Enter the discussion room no." }, { status: 400 });
      if (b.facilityType === "OTHER" && !String(b.facilityOther ?? "").trim())
        return NextResponse.json({ error: "Specify the other library facility." }, { status: 400 });

      // 1. Procedure rules (participants, hours)
      const problems = checkRules({
        facilityType: b.facilityType,
        participantCount: current.participantCount,
        startAt: current.startAt,
        endAt: current.endAt,
      });
      if (problems.length) {
        if (!b.override)
          return NextResponse.json({ error: problems.join(" "), canOverride: auth.isHead }, { status: 422 });
        if (!auth.isHead)
          return NextResponse.json({ error: "Only the Head can override the rules." }, { status: 403 });
      }

      // 2. First come, first served: no overlapping approved reservation on the same facility
      const clash = await prisma.libraryFacilityReservation.findFirst({
        where: {
          courseId,
          id: { not: id },
          status: "APPROVED",
          facilityType: b.facilityType,
          ...(b.facilityType === "DISCUSSION" ? { facilityNo: String(b.facilityNo).trim() } : {}),
          ...(b.facilityType === "OTHER" ? { facilityOther: String(b.facilityOther).trim() } : {}),
          startAt: { lt: current.endAt },
          endAt: { gt: current.startAt },
        },
        select: { name: true, startAt: true, endAt: true },
      });
      if (clash)
        return NextResponse.json(
          {
            error: `Schedule conflict: already reserved by ${clash.name} (${clash.startAt.toISOString()} – ${clash.endAt.toISOString()}).`,
            conflict: true,
          },
          { status: 409 },
        );

      return done({
        status: "APPROVED",
        facilityType: b.facilityType,
        facilityNo: b.facilityType === "DISCUSSION" ? String(b.facilityNo).trim() : null,
        facilityOther: b.facilityType === "OTHER" ? String(b.facilityOther).trim() : null,
        librarianName: b.librarianName?.trim() || null,
        librarianSignatureUrl: b.librarianSignatureUrl || null,
        actionAt: new Date(),
        processedBy: auth.userId,
        disapprovalReason: null,
        requestToken: current.requestToken ?? randomBytes(24).toString("hex"),
      }, true);
    }

    case "disapprove": {
      if (current.status !== "PENDING")
        return NextResponse.json({ error: "Only pending requests can be disapproved." }, { status: 409 });
      const reason = String(b.reason ?? "").trim();
      if (!reason) return NextResponse.json({ error: "Enter the reason for disapproval." }, { status: 400 });
      return done({
        status: "DISAPPROVED",
        disapprovalReason: reason,
        librarianName: b.librarianName?.trim() || null,
        actionAt: new Date(),
        processedBy: auth.userId,
      }, true);
    }

    case "complete":
      if (current.status !== "APPROVED")
        return NextResponse.json({ error: "Only approved reservations can be completed." }, { status: 409 });
     return done({
        status: "COMPLETED",
        completedAt: new Date(),
        csmToken: current.csmToken ?? randomBytes(24).toString("hex"),
      });

    case "noshow": {
      if (current.status !== "APPROVED")
        return NextResponse.json({ error: "Only approved reservations can be marked as no-show." }, { status: 409 });
      if (current.arrivedAt)
        return NextResponse.json({ error: "The requestor already arrived." }, { status: 409 });
      const graceEnds = current.startAt.getTime() + 15 * 60 * 1000;
      if (Date.now() < graceEnds)
        return NextResponse.json({ error: "The 15-minute grace period has not ended yet." }, { status: 409 });
      return done({ status: "NO_SHOW" });
    }

    case "cancel":
      if (current.status === "COMPLETED" || current.status === "CANCELLED")
        return NextResponse.json({ error: "This reservation can no longer be cancelled." }, { status: 409 });
      return done({ status: "CANCELLED" });

    case "arrived":
      if (current.status !== "APPROVED")
        return NextResponse.json({ error: "Only approved reservations can be marked as arrived." }, { status: 409 });
      return done({ arrivedAt: new Date() });

     case "release":
      if (current.status !== "APPROVED" && current.status !== "COMPLETED")
        return NextResponse.json({ error: "Only approved reservations can be released." }, { status: 409 });
      return done({ releasedAt: new Date() });

    case "csm":
      return done({ csmSubmitted: !!b.csmSubmitted });

    case "letter":
      return done({ letterReceived: !!b.letterReceived });

    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id: courseId, reservationId: id } = await ctx.params;
  const auth = await authorize(courseId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.isHead) return NextResponse.json({ error: "Only the Head can delete reservations." }, { status: 403 });

  const { count } = await prisma.libraryFacilityReservation.deleteMany({ where: { id, courseId } });
  if (!count) return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}