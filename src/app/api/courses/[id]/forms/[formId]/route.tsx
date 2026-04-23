import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string; formId: string } }
) {
  const form = await prisma.form.findFirst({
    where: {
      id: params.formId,
      courseId: params.id,
      published: true,
    },
    include: { questions: true },
  });

  if (!form) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ form });
}