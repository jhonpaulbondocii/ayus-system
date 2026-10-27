import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { authorize } from "../_lib";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id: courseId } = await ctx.params;
  const auth = await authorize(courseId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const b = await req.json().catch(() => ({}));
  const requestorType = ["STUDENT", "EMPLOYEE", "COMMUNITY"].includes(b?.requestorType) ? b.requestorType : null;
  const hours = Math.min(Math.max(Number(b?.hours) || 48, 1), 24 * 14);

  const invite = await prisma.libraryFacilityInvite.create({
    data: {
      courseId,
      token: randomBytes(24).toString("hex"),
      requestorType,
      letterReceived: !!b?.letterReceived,
      expiresAt: new Date(Date.now() + hours * 3600 * 1000),
      createdBy: auth.userId,
    },
  });

  const origin = new URL(req.url).origin;
  return NextResponse.json({ url: `${origin}/reserve/i/${invite.token}`, expiresAt: invite.expiresAt }, { status: 201 });
}