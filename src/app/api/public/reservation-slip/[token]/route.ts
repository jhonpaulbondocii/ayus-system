import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const reservation = await prisma.libraryFacilityReservation.findUnique({
    where: { requestToken: token },
    select: {
      name: true, activityType: true, startAt: true, endAt: true, status: true,
      facilityType: true, facilityNo: true, facilityOther: true,
      disapprovalReason: true, arrivedAt: true, participantCount: true,
    },
  });
  if (!reservation) return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  return NextResponse.json({ reservation });
}

/** Self-cancel ng requestor */
export async function POST(req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const b = await req.json().catch(() => null);
  if (b?.action !== "cancel") return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  const r = await prisma.libraryFacilityReservation.findUnique({
    where: { requestToken: token },
    select: { id: true, status: true, startAt: true },
  });
  if (!r) return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  if (r.status !== "PENDING" && r.status !== "APPROVED")
    return NextResponse.json({ error: "This reservation can no longer be cancelled." }, { status: 409 });
  if (r.startAt.getTime() <= Date.now())
    return NextResponse.json({ error: "The reservation has already started. Please contact the library." }, { status: 409 });

  await prisma.libraryFacilityReservation.update({ where: { id: r.id }, data: { status: "CANCELLED" } });
  return NextResponse.json({ ok: true });
}