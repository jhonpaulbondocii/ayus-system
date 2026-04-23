import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { id: string; formId: string } }
) {
  const body = await req.json();

  const submission = await prisma.formSubmission.create({
    data: {
      formId: params.formId,
      userId: body.userId,
      answers: body.answers,
      score: 0,
    },
  });

  return NextResponse.json({
    success: true,
    submission,
  });
}