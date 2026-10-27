import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { notifyStaffNewRequest, sendReceivedEmail } from "@/lib/reservationMail";

type Ctx = { params: Promise<{ token: string }> };

const GONE = { error: "This link is invalid, already used, or expired. Please ask the librarian for a new one." };

async function findValid(token: string) {
  const inv = await prisma.libraryFacilityInvite.findUnique({ where: { token } });
  if (!inv || inv.usedAt || inv.expiresAt.getTime() < Date.now()) return null;
  return inv;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const inv = await findValid(token);
  if (!inv) return NextResponse.json(GONE, { status: 410 });

  const slots = await prisma.libraryFacilityReservation.findMany({
    where: { courseId: inv.courseId, status: { in: ["APPROVED", "PENDING"] }, endAt: { gte: new Date() } },
    select: { startAt: true, endAt: true, status: true },
    orderBy: { startAt: "asc" },
    take: 200,
  });
  return NextResponse.json({ requestorType: inv.requestorType, expiresAt: inv.expiresAt, slots });
}

export async function POST(req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const inv = await findValid(token);
  if (!inv) return NextResponse.json(GONE, { status: 410 });

  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const str = (v: unknown) => String(v ?? "").trim();
  const name = str(b.name);
  const email = str(b.email).toLowerCase();
  const activityType = str(b.activityType);
  const requestorType = inv.requestorType ?? str(b.requestorType);
  const startAt = new Date(b.startAt);
  const endAt = new Date(b.endAt);
  const signature = str(b.signature);

  const participants: { name: string; sex: "M" | "F" }[] = (Array.isArray(b.participants) ? b.participants : [])
    .map((p: { name?: string; sex?: string }) => ({ name: str(p?.name), sex: p?.sex === "F" ? ("F" as const) : ("M" as const) }))
    .filter((p: { name: string }) => p.name);

  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  if (!activityType) return NextResponse.json({ error: "Type of activity is required." }, { status: 400 });
  if (!["STUDENT", "EMPLOYEE", "COMMUNITY"].includes(requestorType))
    return NextResponse.json({ error: "Select the requestor type." }, { status: 400 });
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || endAt <= startAt)
    return NextResponse.json({ error: "End time must be after the start time." }, { status: 400 });
  if (startAt.getTime() < Date.now())
    return NextResponse.json({ error: "Choose a future date and time." }, { status: 400 });
  if ((endAt.getTime() - startAt.getTime()) / 36e5 > 8)
    return NextResponse.json({ error: "Reservations longer than 8 hours are not accepted." }, { status: 400 });
  if (participants.length > 80)
    return NextResponse.json({ error: "Maximum of 80 participants only." }, { status: 400 });
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature) || signature.length > 400_000)
    return NextResponse.json({ error: "Please sign the form." }, { status: 400 });
  if (b.consent !== true)
    return NextResponse.json({ error: "Data Privacy Consent is required." }, { status: 400 });

  const sex = str(b.sex);
  try {
    const created = await prisma.$transaction(async tx => {
      // isang beses lang magagamit ang link
      const claimed = await tx.libraryFacilityInvite.updateMany({
        where: { id: inv.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count === 0) throw new Error("GONE");

      return tx.libraryFacilityReservation.create({
        data: {
          courseId: inv.courseId, requestorType, name, email,
          sex: sex === "M" || sex === "F" ? sex : null,
          contactNo: str(b.contactNo) || null,
          collegeDept: str(b.collegeDept) || null,
          courseYearSection: requestorType === "STUDENT" ? str(b.courseYearSection) || null : null,
          activityType, startAt, endAt,
          participants, participantCount: participants.length,
          letterReceived: inv.letterReceived,
          consentGivenAt: new Date(),
          requestorSignatureUrl: signature,
          requestorSignedAt: new Date(),
          submittedVia: "ONLINE",
          requestToken: randomBytes(24).toString("hex"),
        },
        select: {
          id: true, courseId: true, name: true, email: true, activityType: true,
          startAt: true, endAt: true, participantCount: true,
        },
      });
    });

    notifyStaffNewRequest(created).catch(console.error);
    sendReceivedEmail(created).catch(console.error);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "GONE") return NextResponse.json(GONE, { status: 410 });
    console.error(e);
    return NextResponse.json({ error: "Couldn’t submit your request." }, { status: 500 });
  }
}