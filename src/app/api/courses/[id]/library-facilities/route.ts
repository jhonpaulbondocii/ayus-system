// src/app/api/courses/[courseId]/library-facilities/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ⚠️ same path as in _lib.ts
import { randomBytes } from "crypto";
import { authorize, REQUESTOR_TYPES } from "./_lib";
import { sendCsmEmail } from "@/lib/reservationMail";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id: courseId } = await ctx.params;
  const auth = await authorize(courseId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();
  const type = searchParams.get("type");

  // Auto no-show: approved, walang scan, lampas 15 mins mula start
  const now = new Date();
  await prisma.libraryFacilityReservation.updateMany({
    where: { courseId, status: "APPROVED", arrivedAt: null, startAt: { lt: new Date(now.getTime() - 15 * 60 * 1000) } },
    data: { status: "NO_SHOW" },
  });
  // Auto-complete: dumating at tapos na ang oras
  const due = await prisma.libraryFacilityReservation.findMany({
    where: { courseId, status: "APPROVED", arrivedAt: { not: null }, endAt: { lt: now } },
    select: { id: true },
  });
  for (const d of due) {
    const updated = await prisma.libraryFacilityReservation.update({
      where: { id: d.id },
      data: { status: "COMPLETED", completedAt: now, csmToken: randomBytes(24).toString("hex") },
    });
    sendCsmEmail(updated).catch(console.error);
  }

  const reservations = await prisma.libraryFacilityReservation.findMany({
    where: {
      courseId,
      ...(type ? { requestorType: type } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { activityType: { contains: search, mode: "insensitive" } },
              { collegeDept: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { startAt: "desc" },
  });

  return NextResponse.json({ reservations });
}

export async function POST(req: Request, ctx: Ctx) {
  const { id: courseId } = await ctx.params;
  const auth = await authorize(courseId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const name = String(b.name ?? "").trim();
  const activityType = String(b.activityType ?? "").trim();
  const startAt = new Date(b.startAt);
  const endAt = new Date(b.endAt);
  const participants: { name: string; sex: "M" | "F" }[] = Array.isArray(b.participants)
    ? b.participants
        .map((p: { name?: string; sex?: string }) => ({
          name: String(p?.name ?? "").trim(),
          sex: p?.sex === "F" ? "F" : "M",
        }))
        .filter((p: { name: string }) => p.name)
    : [];

  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!activityType) return NextResponse.json({ error: "Type of activity is required." }, { status: 400 });
  if (!(REQUESTOR_TYPES as readonly string[]).includes(b.requestorType))
    return NextResponse.json({ error: "Select the requestor type." }, { status: 400 });
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || endAt <= startAt)
    return NextResponse.json({ error: "End time must be after the start time." }, { status: 400 });
  if (!b.consent)
    return NextResponse.json({ error: "Data Privacy Consent is required." }, { status: 400 });

  const created = await prisma.libraryFacilityReservation.create({
    data: {
      courseId,
      requestorType: b.requestorType,
      name,
      sex: b.sex === "M" || b.sex === "F" ? b.sex : null,
      email: b.email?.trim() || null,
      contactNo: b.contactNo?.trim() || null,
      collegeDept: b.collegeDept?.trim() || null,
      courseYearSection: b.courseYearSection?.trim() || null,
      activityType,
      startAt,
      endAt,
      participants,
      participantCount: participants.length,
      letterReceived: !!b.letterReceived,
      consentGivenAt: new Date(),
    },
  });

  return NextResponse.json({ reservation: created }, { status: 201 });
}