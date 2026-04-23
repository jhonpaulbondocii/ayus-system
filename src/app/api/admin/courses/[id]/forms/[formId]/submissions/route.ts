import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { formId: string } }
) {
  const submissions = await prisma.formSubmission.findMany({
    where: { formId: params.formId },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ submissions });
}