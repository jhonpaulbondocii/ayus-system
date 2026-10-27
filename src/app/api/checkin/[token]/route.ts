import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "@/app/api/courses/[id]/library-facilities/_lib";

type Ctx = { params: Promise<{ token: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const r = await prisma.libraryFacilityReservation.findUnique({ where: { requestToken: token } });
  if (!r) return NextResponse.json({ error: "Reservation not found." }, { status: 404 });

  const auth = await authorize(r.courseId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const summary = (arrivedAt: Date | null, already = false) => ({
    ok: true, already, name: r.name, activityType: r.activityType,
    startAt: r.startAt, endAt: r.endAt, facilityType: r.facilityType,
    facilityNo: r.facilityNo, facilityOther: r.facilityOther, arrivedAt,
  });

  if (r.status !== "APPROVED")
    return NextResponse.json({ error: `This reservation is ${r.status.toLowerCase().replace("_", "-")}, not approved.` }, { status: 409 });
  if (r.arrivedAt) return NextResponse.json(summary(r.arrivedAt, true));

  const now = Date.now();
  if (now < r.startAt.getTime() - 30 * 60 * 1000)
    return NextResponse.json({ error: "Too early. Check-in opens 30 minutes before the start time." }, { status: 409 });
  if (now > r.endAt.getTime())
    return NextResponse.json({ error: "This reservation has already ended." }, { status: 409 });

  const updated = await prisma.libraryFacilityReservation.update({
    where: { id: r.id }, data: { arrivedAt: new Date() }, select: { arrivedAt: true },
  });
  return NextResponse.json(summary(updated.arrivedAt));
}