import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const forms = await prisma.form.findMany({
    where: {
      courseId: params.id,
      published: true,
    },
    include: { questions: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ forms });
}