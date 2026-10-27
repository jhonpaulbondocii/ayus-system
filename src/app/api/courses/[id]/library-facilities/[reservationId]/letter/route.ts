import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorize } from "../../_lib";

type Ctx = { params: Promise<{ id: string; reservationId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id: courseId, reservationId } = await ctx.params;
  const auth = await authorize(courseId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const letter = await prisma.libraryFacilityLetter.findFirst({
    where: { reservationId, reservation: { courseId } },
    select: { mime: true, data: true },
  });
  if (!letter) return NextResponse.json({ error: "No letter on file." }, { status: 404 });

  return new NextResponse(new Uint8Array(letter.data), {
    headers: { "Content-Type": letter.mime, "Content-Disposition": "inline", "Cache-Control": "private, no-store" },
  });
}