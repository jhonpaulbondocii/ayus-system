import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ token: string }> };
const KEYS = ["q1", "q2", "q3", "q4", "q5"]; // dapat tugma sa QUESTIONS sa page

export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const r = await prisma.libraryFacilityReservation.findUnique({
    where: { csmToken: token },
    select: { name: true, activityType: true, startAt: true, csmSubmittedAt: true },
  });
  if (!r) return NextResponse.json({ error: "Form not found." }, { status: 404 });
  return NextResponse.json({
    name: r.name, activityType: r.activityType, startAt: r.startAt, submitted: !!r.csmSubmittedAt,
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const r = await prisma.libraryFacilityReservation.findUnique({
    where: { csmToken: token },
    select: { id: true, status: true, csmSubmittedAt: true },
  });
  if (!r) return NextResponse.json({ error: "Form not found." }, { status: 404 });
  if (r.csmSubmittedAt) return NextResponse.json({ error: "This form was already submitted." }, { status: 409 });
  if (r.status !== "COMPLETED") return NextResponse.json({ error: "This form is not available." }, { status: 409 });

  const answers: Record<string, number> = {};
  for (const k of KEYS) {
    const v = Number(b.answers?.[k]);
    if (!Number.isInteger(v) || v < 1 || v > 5)
      return NextResponse.json({ error: "Please answer all questions." }, { status: 400 });
    answers[k] = v;
  }
  const comment = String(b.comment ?? "").trim().slice(0, 1000) || null;

  await prisma.$transaction([
    prisma.libraryFacilityCsm.create({ data: { reservationId: r.id, answers, comment } }),
    prisma.libraryFacilityReservation.update({
      where: { id: r.id },
      data: { csmSubmitted: true, csmSubmittedAt: new Date() },
    }),
  ]);
  return NextResponse.json({ ok: true }, { status: 201 });
}