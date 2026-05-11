import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  try {
    const { formId } = await params;
    const body = await req.json();

    const existing = await prisma.formSubmission.findUnique({
      where: {
        formId_userId: {
          formId,
          userId: body.userId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You have already submitted a response to this form." },
        { status: 409 }
      );
    }

    const submission = await prisma.formSubmission.create({
      data: {
        formId,
        userId: body.userId,
        answers: body.answers,
        score: 0,
      },
    });

    return NextResponse.json({ success: true, submission });
  } catch (error: unknown) {
  const prismaError = error as { code?: string };
  if (prismaError.code === "P2002") {
      return NextResponse.json(
        { error: "You have already submitted a response to this form." },
        { status: 409 }
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}