import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId } = await params;
    const { score, durationSeconds, answers } = await req.json();

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        userId: session.user.id,
        score,
        durationSeconds,
        answers,
      },
    });

    return NextResponse.json({ attempt });
  } catch (error) {
    console.error("POST /api/quizzes/[quizId]/attempts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}